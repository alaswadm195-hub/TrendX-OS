import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getCurrentUser } from "@/lib/current-user";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  safeUserSelect,
} from "@/lib/api-security";

const appointmentUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    clientId: z.string().cuid().optional(),
    employeeId: z.string().cuid().optional().nullable(),
    customerName: z.string().trim().max(160).optional().nullable(),
    customerPhone: z.string().trim().max(32).optional().nullable(),
    appointmentDate: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
      .optional(),
    endDate: z
      .string()
      .refine(
        (value) => value === "" || !Number.isNaN(Date.parse(value)),
        "Invalid end date",
      )
      .optional()
      .nullable(),
    location: z.string().trim().max(300).optional().nullable(),
    meetingLink: z
      .string()
      .trim()
      .max(2000)
      .refine((value) => {
        if (value === "") return true;

        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }, "Invalid meeting link")
      .optional()
      .nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    status: z
      .enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
      .optional(),
  })
  .strict()
  .refine(
    (value) => {
      if (!value.appointmentDate || !value.endDate) {
        return true;
      }

      if (value.endDate === "") {
        return true;
      }

      return new Date(value.endDate) >= new Date(value.appointmentDate);
    },
    {
      message: "End date must be after appointment date",
      path: ["endDate"],
    },
  );

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(401, "Unauthorized");
    }

    if (currentUser.role === "EMPLOYEE" && !currentUser.employeeId) {
      throw new ApiError(403, "Forbidden");
    }

    const { id } = await params;

    /*
     * Ownership is enforced by the database query itself.
     * Employees cannot use an appointment ID to discover another employee's
     * appointment. Both a missing appointment and a non-owned appointment
     * return the same 404 response.
     */
    const appointment = await prisma.appointment.findFirst({
      where:
        currentUser.role === "ADMIN"
          ? { id }
          : {
              id,
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
    });

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    return NextResponse.json(appointment, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch appointment");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(401, "Unauthorized");
    }

    if (currentUser.role !== "ADMIN") {
      throw new ApiError(403, "Forbidden");
    }

    const { id } = await params;

    let rawBody: unknown;

    try {
      rawBody = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON");
    }

    const parsedBody = appointmentUpdateSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      throw new ApiError(400, "Invalid request data");
    }

    const body = parsedBody.data;

    if (Object.keys(body).length === 0) {
      throw new ApiError(400, "No update fields provided");
    }

    const currentAppointment = await prisma.appointment.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
        appointmentDate: true,
        endDate: true,
      },
    });

    if (!currentAppointment) {
      throw new ApiError(404, "Appointment not found");
    }

    /*
     * Validate referenced records before applying the update.
     */
    if (body.clientId !== undefined) {
      const client = await prisma.client.findUnique({
        where: {
          id: body.clientId,
        },
        select: {
          id: true,
        },
      });

      if (!client) {
        throw new ApiError(400, "Invalid client");
      }
    }

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

    const nextAppointmentDate =
      body.appointmentDate !== undefined
        ? new Date(body.appointmentDate)
        : currentAppointment.appointmentDate;

    const nextEndDate =
      body.endDate !== undefined
        ? body.endDate
          ? new Date(body.endDate)
          : null
        : currentAppointment.endDate;

    if (nextEndDate && nextEndDate < nextAppointmentDate) {
      throw new ApiError(
        400,
        "End date must be after appointment date",
      );
    }

    const previousStatus = currentAppointment.status;

    const appointment = await prisma.appointment.update({
      where: {
        id,
      },

      data: {
        ...(body.title !== undefined && {
          title: body.title,
        }),

        ...(body.clientId !== undefined && {
          clientId: body.clientId,
        }),

        ...(body.employeeId !== undefined && {
          employeeId: body.employeeId || null,
        }),

        ...(body.customerName !== undefined && {
          customerName: body.customerName || null,
        }),

        ...(body.customerPhone !== undefined && {
          customerPhone: body.customerPhone || null,
        }),

        ...(body.appointmentDate !== undefined && {
          appointmentDate: new Date(body.appointmentDate),
        }),

        ...(body.endDate !== undefined && {
          endDate: body.endDate ? new Date(body.endDate) : null,
        }),

        ...(body.location !== undefined && {
          location: body.location || null,
        }),

        ...(body.meetingLink !== undefined && {
          meetingLink: body.meetingLink || null,
        }),

        ...(body.notes !== undefined && {
          notes: body.notes || null,
        }),

        ...(body.status !== undefined && {
          status: body.status,
        }),
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

    /*
     * Send confirmation only when the appointment transitions into CONFIRMED.
     * Notification failure must not roll back the already-valid appointment update.
     */
    if (
      previousStatus !== "CONFIRMED" &&
      appointment.status === "CONFIRMED" &&
      appointment.customerPhone
    ) {
      try {
        const appointmentDate = new Date(appointment.appointmentDate);

        const formattedDate = appointmentDate.toLocaleDateString("ar-EG", {
          timeZone: "Africa/Cairo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });

        const formattedTime = appointmentDate.toLocaleTimeString("ar-EG", {
          timeZone: "Africa/Cairo",
          hour: "2-digit",
          minute: "2-digit",
        });

        await sendWhatsAppMessage({
          to: appointment.customerPhone,

          message: `تم تأكيد موعدك مع TrendX

📅 التاريخ:
${formattedDate}

⏰ الوقت:
${formattedTime}

📍 المكان:
${appointment.location || "سيتم تحديده لاحقاً"}

شكراً لتعاملك معنا ❤️`,
        });

        console.info("Appointment WhatsApp confirmation sent");
      } catch (whatsappError) {
        console.error(
          "Appointment WhatsApp confirmation failed",
          whatsappError,
        );
      }
    }

    return NextResponse.json(appointment, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to update appointment");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(401, "Unauthorized");
    }

    if (currentUser.role !== "ADMIN") {
      throw new ApiError(403, "Forbidden");
    }

    const { id } = await params;

    const deleted = await prisma.appointment.deleteMany({
      where: {
        id,
      },
    });

    if (deleted.count !== 1) {
      throw new ApiError(404, "Appointment not found");
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return apiError(error, "Failed to delete appointment");
  }
}
