import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { sendTaskEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function GET() {
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

    const tasks = await prisma.task.findMany({
      where:
        currentUser.role === "ADMIN"
          ? {}
          : {
              employeeId: currentUser.employeeId!,
            },

      include: {
        employee: {
          include: {
            user: true,
          },
        },
        client: true,
        activities: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: Request) {
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

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Only admins can create tasks",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        {
          error: "Title is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.clientId) {
      return NextResponse.json(
        {
          error: "Client is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.employeeId) {
      return NextResponse.json(
        {
          error: "Employee is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.dueDate) {
      return NextResponse.json(
        {
          error: "Due date is required",
        },
        {
          status: 400,
        }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,

        description:
          body.description || null,

        clientId:
          body.clientId,

        employeeId:
          body.employeeId,

        dueDate: new Date(
          body.dueDate
        ),

        fileUrl:
          body.fileUrl || null,

        priority:
          body.priority || "ON_TIME",

        status: "TODO",
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

    /*
     * تسجيل إنشاء المهمة
     */

    await prisma.taskActivity.create({
      data: {
        taskId: task.id,

        action: `تم إنشاء المهمة وإسنادها إلى ${task.employee.user.name}`,
      },
    });

    /*
     * إرسال Email للموظف
     */

    try {
      await sendTaskEmail({
        to: task.employee.user.email,

        employeeName:
          task.employee.user.name,

        taskTitle:
          task.title,

        clientName:
          task.client.name,

        dueDate:
          new Date(
            task.dueDate
          ).toLocaleDateString(
            "ar-EG"
          ),
      });

      console.log(
        `📧 Task email sent to ${task.employee.user.email}`
      );
    } catch (emailError) {
      console.error(
        "Email Error:",
        emailError
      );
    }

    /*
     * إرسال WhatsApp للموظف
     */

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
${new Date(
  task.dueDate
).toLocaleDateString("ar-EG")}

⚡ الأولوية:
${
  task.priority === "URGENT"
    ? "مستعجلة 🔥"
    : "تسليم في موعدها"
}

يرجى الدخول إلى TrendX OS لمراجعة تفاصيل المهمة.`,
        });

        console.log(
          `📱 WhatsApp task notification sent to ${task.employee.phone}`
        );
      } else {
        console.log(
          "⚠️ Employee has no phone number"
        );
      }
    } catch (whatsappError) {
      console.error(
        "WhatsApp Error:",
        whatsappError
      );
    }

    /*
     * إرجاع المهمة
     */

    return NextResponse.json(task);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create task",
      },
      {
        status: 500,
      }
    );
  }
}