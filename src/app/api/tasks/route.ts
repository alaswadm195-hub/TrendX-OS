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
import { sendTaskEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

function isSafeHttpUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional().nullable(),
    clientId: z.string().cuid(),
    employeeId: z.string().cuid(),
    dueDate: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
    fileUrl: z
      .string()
      .trim()
      .max(2000)
      .refine(
        isSafeHttpUrl,
        "File URL must use http or https",
      )
      .optional()
      .nullable(),
    priority: z.enum(["URGENT", "ON_TIME"]).optional().default("ON_TIME"),
  })
  .strict();

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(401, "Unauthorized");
    }

    if (currentUser.role === "EMPLOYEE" && !currentUser.employeeId) {
      throw new ApiError(403, "Forbidden");
    }

    const tasks = await prisma.task.findMany({
      where:
        currentUser.role === "ADMIN"
          ? undefined
          : {
              employeeId: currentUser.employeeId!,
            },

      include: {
        employee: {
          include: {
            user: {
              select: safeUserSelect,
            },
          },
        },

        client: true,

        activities: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to fetch tasks");
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

    const parsed = taskCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      throw new ApiError(400, "Invalid request data");
    }

    const body = parsed.data;

    const dueDate = new Date(body.dueDate);

    const [client, employee] = await Promise.all([
      prisma.client.findUnique({
        where: {
          id: body.clientId,
        },
        select: {
          id: true,
        },
      }),

      prisma.employee.findUnique({
        where: {
          id: body.employeeId,
        },
        select: {
          id: true,
          status: true,
        },
      }),
    ]);

    if (!client) {
      throw new ApiError(400, "Invalid client");
    }

    if (!employee) {
      throw new ApiError(400, "Invalid employee");
    }

    if (employee.status === "SUSPENDED") {
      throw new ApiError(409, "Cannot assign tasks to a suspended employee");
    }

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          title: body.title,
          description: body.description || null,
          clientId: body.clientId,
          employeeId: body.employeeId,
          dueDate,
          fileUrl: body.fileUrl || null,
          priority: body.priority,
          status: "TODO",
        },

        include: {
          employee: {
            include: {
              user: {
                select: safeUserSelect,
              },
            },
          },

          client: true,
        },
      });

      await tx.taskActivity.create({
        data: {
          taskId: createdTask.id,
          action: `تم إنشاء المهمة وإسنادها إلى ${createdTask.employee.user.name}`,
        },
      });

      return createdTask;
    });

    try {
      await sendTaskEmail({
        to: task.employee.user.email,
        employeeName: task.employee.user.name,
        taskTitle: task.title,
        clientName: task.client.name,
        dueDate: new Date(task.dueDate).toLocaleDateString("ar-EG"),
      });

      console.info("Task email notification sent");
    } catch (emailError) {
      console.error("Task email notification failed", emailError);
    }

    try {
      if (task.employee.phone) {
        await sendWhatsAppMessage({
          to: task.employee.phone,

          message: `🔥 مهمة جديدة من TrendX OS

👤 الموظف:
${task.employee.user.name}

📌 المهمة:
${task.title}

👥 العميل:
${task.client.name}

📅 موعد التسليم:
${new Date(task.dueDate).toLocaleDateString("ar-EG")}

⚡ الأولوية:
${task.priority === "URGENT" ? "مستعجلة 🔥" : "تسليم في موعدها"}

يرجى الدخول إلى TrendX OS لمراجعة تفاصيل المهمة.`,
        });

        console.info("Task WhatsApp notification sent");
      } else {
        console.info("Task WhatsApp notification skipped: employee has no phone");
      }
    } catch (whatsappError) {
      console.error("Task WhatsApp notification failed", whatsappError);
    }

    return NextResponse.json(task, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to create task");
  }
}
