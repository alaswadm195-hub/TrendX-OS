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

const taskActionSchema = z
  .object({
    action: z.enum(["START", "SUBMIT_REVIEW", "APPROVE", "RETURN"]),
  })
  .strict();

type TaskAction = z.infer<typeof taskActionSchema>["action"];

const EMPLOYEE_ACTIONS: TaskAction[] = ["START", "SUBMIT_REVIEW"];

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

    if (currentUser.role === "EMPLOYEE" && !currentUser.employeeId) {
      throw new ApiError(403, "Forbidden");
    }

    const { id } = await params;

    let rawBody: unknown;

    try {
      rawBody = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON");
    }

    const parsedBody = taskActionSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      throw new ApiError(400, "Invalid request data");
    }

    const { action } = parsedBody.data;

    if (
      currentUser.role === "EMPLOYEE" &&
      !EMPLOYEE_ACTIONS.includes(action)
    ) {
      throw new ApiError(403, "Forbidden");
    }

    /*
     * IDOR / ownership protection:
     * - Admin can access any task.
     * - Employee can access only a task assigned to their own employeeId.
     *
     * Ownership is enforced inside the database query itself, so we do not
     * fetch another employee's task and then decide whether to expose it.
     */
    const task = await prisma.task.findFirst({
      where:
        currentUser.role === "ADMIN"
          ? { id }
          : {
              id,
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
      },
    });

    /*
     * Returning 404 for a resource outside the employee's scope avoids
     * confirming whether another employee's task ID exists.
     */
    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER || "";

    let newStatus = task.status;
    let activity = "";
    let whatsappMessage = "";
    let whatsappReceiver = "";

    switch (action) {
      case "START": {
        if (task.status !== "TODO") {
          throw new ApiError(
            409,
            "Task cannot be started from its current status",
          );
        }

        newStatus = "IN_PROGRESS";
        activity = `${task.employee.user.name} بدأ تنفيذ المهمة`;
        whatsappReceiver = adminWhatsApp;

        whatsappMessage = `🚀 بدأ تنفيذ مهمة

👤 الموظف:
${task.employee.user.name}

📌 المهمة:
${task.title}

👥 العميل:
${task.client.name}

📅 موعد التسليم:
${new Date(task.dueDate).toLocaleDateString("ar-EG")}

بدأ الموظف تنفيذ المهمة الآن.

TrendX OS`;

        break;
      }

      case "SUBMIT_REVIEW": {
        if (task.status !== "IN_PROGRESS") {
          throw new ApiError(
            409,
            "Task must be in progress before submitting for review",
          );
        }

        newStatus = "REVIEW";
        activity = `${task.employee.user.name} أرسل المهمة للمراجعة`;
        whatsappReceiver = adminWhatsApp;

        whatsappMessage = `📤 مهمة جاهزة للمراجعة

👤 الموظف:
${task.employee.user.name}

📌 المهمة:
${task.title}

👥 العميل:
${task.client.name}

📅 موعد التسليم:
${new Date(task.dueDate).toLocaleDateString("ar-EG")}

تم تسليم المهمة للمراجعة.

يرجى الدخول إلى TrendX OS لمراجعة المهمة.

TrendX OS`;

        break;
      }

      case "APPROVE": {
        if (currentUser.role !== "ADMIN") {
          throw new ApiError(403, "Forbidden");
        }

        if (task.status !== "REVIEW") {
          throw new ApiError(
            409,
            "Task must be under review before approval",
          );
        }

        newStatus = "DONE";
        activity = "تم اعتماد المهمة";
        whatsappReceiver = task.employee.phone || "";

        whatsappMessage = `✅ تم اعتماد المهمة

👤 الموظف:
${task.employee.user.name}

📌 المهمة:
${task.title}

👥 العميل:
${task.client.name}

تمت مراجعة المهمة واعتمادها بنجاح.

أحسنت 🎉

TrendX OS`;

        break;
      }

      case "RETURN": {
        if (currentUser.role !== "ADMIN") {
          throw new ApiError(403, "Forbidden");
        }

        if (task.status !== "REVIEW") {
          throw new ApiError(
            409,
            "Task must be under review before returning",
          );
        }

        newStatus = "IN_PROGRESS";
        activity = "تمت إعادة المهمة للتنفيذ";
        whatsappReceiver = task.employee.phone || "";

        whatsappMessage = `↩️ تم إرجاع المهمة للتعديل

👤 الموظف:
${task.employee.user.name}

📌 المهمة:
${task.title}

👥 العميل:
${task.client.name}

تمت مراجعة المهمة وتحتاج إلى تعديلات.

يرجى الدخول إلى TrendX OS ومراجعة المطلوب وتنفيذ التعديلات.

TrendX OS`;

        break;
      }
    }

    /*
     * Update + activity must succeed together.
     * The old status is included in updateMany to prevent concurrent requests
     * from applying two workflow transitions from the same stale state.
     */
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.task.updateMany({
        where: {
          id: task.id,
          status: task.status,
        },
        data: {
          status: newStatus,
        },
      });

      if (updateResult.count !== 1) {
        throw new ApiError(
          409,
          "Task status changed. Refresh and try again",
        );
      }

      await tx.taskActivity.create({
        data: {
          taskId: task.id,
          action: activity,
        },
      });

      const updated = await tx.task.findUnique({
        where: {
          id: task.id,
        },
      });

      if (!updated) {
        throw new ApiError(404, "Task not found");
      }

      return updated;
    });

    /*
     * WhatsApp is deliberately outside the transaction. A notification outage
     * must not roll back a valid workflow change in the database.
     */
    if (whatsappReceiver && whatsappMessage) {
      try {
        await sendWhatsAppMessage({
          to: whatsappReceiver,
          message: whatsappMessage,
        });

        console.info("WhatsApp task workflow notification sent");
      } catch (whatsappError) {
        console.error(
          "WhatsApp task workflow notification failed",
          whatsappError,
        );
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    return apiError(error, "Failed to update task");
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

    await prisma.$transaction(async (tx) => {
      /*
       * Delete dependent activity rows first so this works even if the current
       * database relation is not configured with ON DELETE CASCADE.
       */
      await tx.taskActivity.deleteMany({
        where: {
          taskId: id,
        },
      });

      const deleted = await tx.task.deleteMany({
        where: {
          id,
        },
      });

      if (deleted.count !== 1) {
        throw new ApiError(404, "Task not found");
      }
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    return apiError(error, "Failed to delete task");
  }
}
