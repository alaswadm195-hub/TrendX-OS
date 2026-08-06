import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const task = await prisma.task.findUnique({
      where: {
        id,
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
        client: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        {
          error: "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    // الموظف لا يمكنه التعامل إلا مع مهامه فقط
    if (
      currentUser.role ===
        "EMPLOYEE" &&
      task.employeeId !==
        currentUser.employeeId
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    // الموظف مسموح له فقط ببدء المهمة أو إرسالها للمراجعة
    if (
      currentUser.role ===
      "EMPLOYEE"
    ) {
      const allowedActions = [
        "START",
        "SUBMIT_REVIEW",
      ];

      if (
        !allowedActions.includes(
          body.action
        )
      ) {
        return NextResponse.json(
          {
            error:
              "You are not allowed to perform this action",
          },
          {
            status: 403,
          }
        );
      }
    }

    // الأدمن فقط يعتمد أو يرجع المهمة
    if (
      ["APPROVE", "RETURN"].includes(
        body.action
      ) &&
      currentUser.role !==
        "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Only admins can perform this action",
        },
        {
          status: 403,
        }
      );
    }

    let newStatus = task.status;
    let activity = "";
    let whatsappMessage = "";
    let whatsappReceiver = "";

    switch (body.action) {
      case "START":
        newStatus = "IN_PROGRESS";

        activity = `${task.employee.user.name} بدأ تنفيذ المهمة`;

        whatsappReceiver =
          process.env.ADMIN_WHATSAPP ||
          "";

        whatsappMessage = `🚀 بدء تنفيذ مهمة

الموظف: ${task.employee.user.name}

المهمة:
${task.title}`;

        break;

      case "SUBMIT_REVIEW":
        newStatus = "REVIEW";

        activity = `${task.employee.user.name} أرسل المهمة للمراجعة`;

        whatsappReceiver =
          process.env.ADMIN_WHATSAPP ||
          "";

        whatsappMessage = `📤 مهمة جاهزة للمراجعة

الموظف: ${task.employee.user.name}

المهمة:
${task.title}`;

        break;

      case "APPROVE":
        newStatus = "DONE";

        activity =
          "تم اعتماد المهمة";

        whatsappReceiver =
          task.employee.phone ||
          "";

        whatsappMessage = `✅ تم اعتماد المهمة

المهمة:
${task.title}

أحسنت 🎉`;

        break;

      case "RETURN":
        newStatus =
          "IN_PROGRESS";

        activity =
          "تمت إعادة المهمة للتنفيذ";

        whatsappReceiver =
          task.employee.phone ||
          "";

        whatsappMessage = `↩ تم إرجاع المهمة للتعديل

المهمة:
${task.title}

يرجى مراجعتها وإعادة رفعها.`;

        break;

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action",
          },
          {
            status: 400,
          }
        );
    }

    const updatedTask =
      await prisma.task.update({
        where: {
          id,
        },
        data: {
          status: newStatus,
        },
      });

    await prisma.taskActivity.create({
      data: {
        taskId: id,
        action: activity,
      },
    });

    try {
      if (
        whatsappReceiver &&
        whatsappMessage
      ) {
        await sendWhatsAppMessage({
          to: whatsappReceiver,
          message:
            whatsappMessage,
        });
      }
    } catch (error) {
      console.error(
        "Workflow WhatsApp Error:",
        error
      );
    }

    return NextResponse.json(
      updatedTask
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to update task",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    if (
      currentUser.role !==
      "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Only admins can delete tasks",
        },
        {
          status: 403,
        }
      );
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: {
        id,
      },
    });

    if (!task) {
      return NextResponse.json(
        {
          error: "Task not found",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.taskActivity.deleteMany({
      where: {
        taskId: id,
      },
    });

    await prisma.task.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Task deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to delete task",
      },
      {
        status: 500,
      }
    );
  }
}