import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

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

    /*
     * الموظف لا يستطيع التعامل
     * إلا مع المهام المسندة إليه
     */

    if (
      currentUser.role === "EMPLOYEE" &&
      task.employeeId !== currentUser.employeeId
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

    /*
     * الموظف مسموح له فقط:
     * START
     * SUBMIT_REVIEW
     */

    if (currentUser.role === "EMPLOYEE") {
      const allowedActions = [
        "START",
        "SUBMIT_REVIEW",
      ];

      if (!allowedActions.includes(body.action)) {
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

    /*
     * الأدمن فقط:
     * APPROVE
     * RETURN
     */

    if (
      ["APPROVE", "RETURN"].includes(body.action) &&
      currentUser.role !== "ADMIN"
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

    /*
     * أرقام WhatsApp
     *
     * رقم الشركة هو الحساب المتصل بخدمة WhatsApp.
     *
     * ADMIN_WHATSAPP_NUMBER:
     * الرقم الذي يستقبل إشعارات الموظفين.
     *
     * employee.phone:
     * رقم الموظف الذي يستقبل إشعارات
     * الاعتماد أو الإرجاع.
     */

    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER || "";

    let newStatus = task.status;

    let activity = "";

    let whatsappMessage = "";

    let whatsappReceiver = "";

    /*
     * =========================
     * START
     * =========================
     *
     * الموظف بدأ تنفيذ المهمة
     *
     * الرسالة:
     * رقم الشركة → الأدمن
     */

    switch (body.action) {
      case "START": {
        if (task.status !== "TODO") {
          return NextResponse.json(
            {
              error:
                "Task cannot be started from its current status",
            },
            {
              status: 400,
            }
          );
        }

        newStatus = "IN_PROGRESS";

        activity =
          `${task.employee.user.name} بدأ تنفيذ المهمة`;

        whatsappReceiver = adminWhatsApp;

        whatsappMessage = `🚀 بدأ تنفيذ مهمة

👤 الموظف:
${task.employee.user.name}

📌 المهمة:
${task.title}

👥 العميل:
${task.client.name}

📅 موعد التسليم:
${new Date(
  task.dueDate
).toLocaleDateString("ar-EG")}

بدأ الموظف تنفيذ المهمة الآن.

TrendX OS`;

        break;
      }

      /*
       * =========================
       * SUBMIT REVIEW
       * =========================
       *
       * الموظف سلّم المهمة للمراجعة
       *
       * الرسالة:
       * رقم الشركة → الأدمن
       */

      case "SUBMIT_REVIEW": {
        if (task.status !== "IN_PROGRESS") {
          return NextResponse.json(
            {
              error:
                "Task must be in progress before submitting for review",
            },
            {
              status: 400,
            }
          );
        }

        newStatus = "REVIEW";

        activity =
          `${task.employee.user.name} أرسل المهمة للمراجعة`;

        whatsappReceiver = adminWhatsApp;

        whatsappMessage = `📤 مهمة جاهزة للمراجعة

👤 الموظف:
${task.employee.user.name}

📌 المهمة:
${task.title}

👥 العميل:
${task.client.name}

📅 موعد التسليم:
${new Date(
  task.dueDate
).toLocaleDateString("ar-EG")}

تم تسليم المهمة للمراجعة.

يرجى الدخول إلى TrendX OS لمراجعة المهمة.

TrendX OS`;

        break;
      }

      /*
       * =========================
       * APPROVE
       * =========================
       *
       * الأدمن اعتمد المهمة
       *
       * الرسالة:
       * رقم الشركة → الموظف
       */

      case "APPROVE": {
        if (task.status !== "REVIEW") {
          return NextResponse.json(
            {
              error:
                "Task must be under review before approval",
            },
            {
              status: 400,
            }
          );
        }

        newStatus = "DONE";

        activity = "تم اعتماد المهمة";

        whatsappReceiver =
          task.employee.phone || "";

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

      /*
       * =========================
       * RETURN
       * =========================
       *
       * الأدمن رجّع المهمة للتعديل
       *
       * الرسالة:
       * رقم الشركة → الموظف
       */

      case "RETURN": {
        if (task.status !== "REVIEW") {
          return NextResponse.json(
            {
              error:
                "Task must be under review before returning",
            },
            {
              status: 400,
            }
          );
        }

        newStatus = "IN_PROGRESS";

        activity =
          "تمت إعادة المهمة للتنفيذ";

        whatsappReceiver =
          task.employee.phone || "";

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

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
          },
          {
            status: 400,
          }
        );
    }

    /*
     * =========================
     * تحديث المهمة
     * =========================
     */

    const updatedTask =
      await prisma.task.update({
        where: {
          id,
        },

        data: {
          status: newStatus,
        },
      });

    /*
     * =========================
     * تسجيل النشاط
     * =========================
     */

    await prisma.taskActivity.create({
      data: {
        taskId: id,
        action: activity,
      },
    });

    /*
     * =========================
     * إرسال WhatsApp
     * =========================
     *
     * كل الرسائل تخرج من رقم الشركة
     * المتصل بـ WhatsApp Service.
     *
     * المستلم يتغير حسب الحدث:
     *
     * START          → ADMIN
     * SUBMIT_REVIEW  → ADMIN
     * APPROVE        → EMPLOYEE
     * RETURN         → EMPLOYEE
     */

    try {
      if (
        whatsappReceiver &&
        whatsappMessage
      ) {
        await sendWhatsAppMessage({
          to: whatsappReceiver,
          message: whatsappMessage,
        });

        console.log(
          "📱 Workflow WhatsApp sent successfully"
        );

        console.log(
          "📤 Receiver:",
          whatsappReceiver
        );
      } else {
        console.log(
          "⚠️ WhatsApp notification skipped"
        );

        if (!whatsappReceiver) {
          console.log(
            "⚠️ WhatsApp receiver is missing"
          );
        }
      }
    } catch (whatsappError) {
      /*
       * لو WhatsApp فشل،
       * المهمة نفسها تفضل اتحدثت عادي.
       */

      console.error(
        "❌ Workflow WhatsApp Error:",
        whatsappError
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

    if (currentUser.role !== "ADMIN") {
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

    const task =
      await prisma.task.findUnique({
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