import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  safeUserSelect,
} from "@/lib/api-security";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const nullableText = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const dateString = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

const meetingLinkSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (value === "") {
      return true;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Invalid meeting link")
  .optional()
  .nullable();

const newClientSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(1).max(32),
    notes: nullableText(2000),
  })
  .strict();

const appointmentCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),

    clientId: z.string().cuid().optional().nullable(),

    newClient: newClientSchema.optional().nullable(),

    employeeId: z.string().cuid().optional().nullable(),

    customerName: nullableText(160),

    customerPhone: nullableText(32),

    appointmentDate: dateString,

    endDate: z
      .string()
      .refine(
        (value) => value === "" || !Number.isNaN(Date.parse(value)),
        "Invalid end date",
      )
      .optional()
      .nullable(),

    location: nullableText(300),

    meetingLink: meetingLinkSchema,

    notes: nullableText(5000),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasExistingClient = Boolean(value.clientId);
    const hasNewClient = Boolean(value.newClient);

    if (!hasExistingClient && !hasNewClient) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clientId"],
        message: "Client is required",
      });
    }

    if (hasExistingClient && hasNewClient) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clientId"],
        message: "Choose an existing client or create a new client",
      });
    }

    if (
      value.endDate &&
      new Date(value.endDate) < new Date(value.appointmentDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after appointment date",
      });
    }
  });

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(401, "Unauthorized");
    }

    if (currentUser.role === "EMPLOYEE" && !currentUser.employeeId) {
      throw new ApiError(403, "Forbidden");
    }

    const appointments = await prisma.appointment.findMany({
      where:
        currentUser.role === "ADMIN"
          ? undefined
          : {
              employeeId: currentUser.employeeId!,
            },

      include: {
        client: true,

        employee: {
          include: {
            user: {
              select: safeUserSelect,
            },
          },
        },
      },

      orderBy: {
        appointmentDate: "asc",
      },
    });

    return NextResponse.json(appointments, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch appointments");
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(401, "Unauthorized");
    }

    if (currentUser.role !== "ADMIN") {
      throw new ApiError(403, "Forbidden");
    }

    let rawBody: unknown;

    try {
      rawBody = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON");
    }

    const parsed = appointmentCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      throw new ApiError(400, "Invalid request data");
    }

    const body = parsed.data;

    /*
     * Validate the selected employee before the transaction.
     * A suspended employee must not receive new appointments.
     */
    if (body.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: {
          id: body.employeeId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!employee) {
        throw new ApiError(400, "Invalid employee");
      }

      if (employee.status === "SUSPENDED") {
        throw new ApiError(
          409,
          "Cannot assign appointments to a suspended employee",
        );
      }
    }

    /*
     * Existing-client validation and new-client creation happen together
     * with appointment creation. If any step fails, the transaction rolls back.
     */
    const appointment = await prisma.$transaction(async (tx) => {
      let clientId = body.clientId || null;

      if (body.newClient) {
        const newClient = await tx.client.create({
          data: {
            name: body.newClient.name,
            phone: body.newClient.phone,
            notes: body.newClient.notes || null,
          },
          select: {
            id: true,
          },
        });

        clientId = newClient.id;
      }

      if (!clientId) {
        throw new ApiError(400, "Client is required");
      }

      if (body.clientId) {
        const existingClient = await tx.client.findUnique({
          where: {
            id: clientId,
          },
          select: {
            id: true,
          },
        });

        if (!existingClient) {
          throw new ApiError(400, "Invalid client");
        }
      }

      return tx.appointment.create({
        data: {
          title: body.title,
          clientId,

          employeeId: body.employeeId || null,

          customerName: body.customerName || null,
          customerPhone: body.customerPhone || null,

          appointmentDate: new Date(body.appointmentDate),

          endDate: body.endDate
            ? new Date(body.endDate)
            : null,

          location: body.location || null,
          meetingLink: body.meetingLink || null,
          notes: body.notes || null,

          // Preserve the current business behavior:
          // newly-created appointments are confirmed immediately.
          status: "CONFIRMED",
        },

        include: {
          client: true,

          employee: {
            include: {
              user: {
                select: safeUserSelect,
              },
            },
          },
        },
      });
    });

    /*
     * WhatsApp is outside the DB transaction.
     * Notification failure must never roll back a valid appointment.
     */
    try {
      const whatsappGroup = process.env.ADMIN_WHATSAPP_GROUP_ID;
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

      const whatsappReceiver =
        whatsappGroup ||
        adminNumber ||
        "";

      if (!whatsappReceiver) {
        console.info(
          "Appointment WhatsApp notification skipped: no receiver configured",
        );
      } else {
        const appointmentDate = new Date(
          appointment.appointmentDate,
        );

        const formattedDate =
          appointmentDate.toLocaleDateString(
            "ar-EG",
            {
              timeZone: "Africa/Cairo",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            },
          );

        const formattedTime =
          appointmentDate.toLocaleTimeString(
            "ar-EG",
            {
              timeZone: "Africa/Cairo",
              hour: "2-digit",
              minute: "2-digit",
            },
          );

        const employeeName =
          appointment.employee?.user?.name ||
          "لم يتم تحديد موظف";

        const location =
          appointment.location ||
          "غير محدد";

        const meetingLink =
          appointment.meetingLink ||
          "";

        const notes =
          appointment.notes ||
          "";

        const whatsappMessage = `📅 موعد جديد

📌 عنوان الموعد:
${appointment.title}

👤 العميل:
${appointment.client.name}

📞 رقم العميل:
${appointment.client.phone || "غير مسجل"}

👨‍💼 الموظف:
${employeeName}

📅 التاريخ:
${formattedDate}

⏰ الوقت:
${formattedTime}

📍 المكان:
${location}
${
  meetingLink
    ? `

🔗 رابط الاجتماع:
${meetingLink}`
    : ""
}
${
  notes
    ? `

📝 الملاحظات:
${notes}`
    : ""
}

✅ تم إضافة الموعد إلى TrendX OS بنجاح.`;

        await sendWhatsAppMessage({
          to: whatsappReceiver,
          message: whatsappMessage,
        });

        console.info(
          "Appointment WhatsApp notification sent",
        );
      }
    } catch (whatsappError) {
      console.error(
        "Appointment WhatsApp notification failed",
        whatsappError,
      );
    }

    return NextResponse.json(
      appointment,
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(
      error,
      "Failed to create appointment",
    );
  }
}
