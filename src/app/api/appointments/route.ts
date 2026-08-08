import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const appointments =
      await prisma.appointment.findMany({
        include: {
          client: true,

          employee: {
            include: {
              user: true,
            },
          },
        },

        orderBy: {
          appointmentDate: "asc",
        },
      });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error(
      "Get Appointments Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch appointments",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  req: Request
) {
  try {
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    // الموظف لا يستطيع إنشاء موعد
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        {
          message: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();

    /*
     * ============================
     * التحقق من البيانات الأساسية
     * ============================
     */

    if (
      !body.title ||
      !body.title.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Title is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.appointmentDate) {
      return NextResponse.json(
        {
          error:
            "Appointment date is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================
     * التحقق من العميل
     * ============================
     */

    const hasExistingClient =
      Boolean(body.clientId);

    const hasNewClient =
      Boolean(body.newClient);

    if (
      !hasExistingClient &&
      !hasNewClient
    ) {
      return NextResponse.json(
        {
          error:
            "Client is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      hasExistingClient &&
      hasNewClient
    ) {
      return NextResponse.json(
        {
          error:
            "Choose an existing client or create a new client",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================
     * التحقق من العميل الجديد
     * ============================
     */

    if (hasNewClient) {
      if (
        !body.newClient.name ||
        !body.newClient.name.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "New client name is required",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !body.newClient.phone ||
        !body.newClient.phone.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "New client phone is required",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * ============================
     * إنشاء العميل + الموعد
     * داخل Transaction
     * ============================
     */

    const appointment =
      await prisma.$transaction(
        async (tx) => {
          let clientId =
            body.clientId || null;

          /*
           * لو العميل جديد:
           * ننشئه أولًا
           */

          if (hasNewClient) {
            const newClient =
              await tx.client.create({
                data: {
                  name:
                    body.newClient.name.trim(),

                  phone:
                    body.newClient.phone.trim(),

                  notes:
                    body.newClient.notes
                      ? body.newClient.notes.trim()
                      : null,
                },
              });

            clientId = newClient.id;
          }

          /*
           * حماية إضافية
           */

          if (!clientId) {
            throw new Error(
              "Client ID is missing"
            );
          }

          /*
           * لو العميل موجود:
           * نتأكد إنه موجود فعلًا
           */

          if (hasExistingClient) {
            const existingClient =
              await tx.client.findUnique({
                where: {
                  id: clientId,
                },
              });

            if (!existingClient) {
              throw new Error(
                "Client not found"
              );
            }
          }

          /*
           * إنشاء الموعد
           */

          const createdAppointment =
            await tx.appointment.create({
              data: {
                title:
                  body.title.trim(),

                clientId,

                employeeId:
                  body.employeeId ||
                  null,

                customerName:
                  body.customerName
                    ? body.customerName.trim()
                    : null,

                customerPhone:
                  body.customerPhone
                    ? body.customerPhone.trim()
                    : null,

                appointmentDate:
                  new Date(
                    body.appointmentDate
                  ),

                endDate:
                  body.endDate
                    ? new Date(
                        body.endDate
                      )
                    : null,

                location:
                  body.location
                    ? body.location.trim()
                    : null,

                meetingLink:
                  body.meetingLink
                    ? body.meetingLink.trim()
                    : null,

                notes:
                  body.notes
                    ? body.notes.trim()
                    : null,

                // الموعد يتأكد تلقائيًا
                status: "CONFIRMED",
              },

              include: {
                client: true,

                employee: {
                  include: {
                    user: true,
                  },
                },
              },
            });

          return createdAppointment;
        }
      );

    /*
     * ============================
     * WhatsApp Notification
     * ============================
     *
     * الأولوية:
     *
     * 1. الجروب
     * 2. رقم الأدمن
     *
     * لو ADMIN_WHATSAPP_GROUP_ID موجود
     * الرسالة ستذهب للجروب مباشرة.
     *
     * لو غير موجودة ستذهب للأدمن.
     */

    try {
      const whatsappGroup =
        process.env.ADMIN_WHATSAPP_GROUP_ID;

      const adminNumber =
        process.env.ADMIN_WHATSAPP_NUMBER;

      const whatsappReceiver =
        whatsappGroup ||
        adminNumber ||
        "";

      if (!whatsappReceiver) {
        console.warn(
          "⚠️ Appointment WhatsApp skipped: no group ID or admin number configured"
        );
      } else {
        const appointmentDate =
          new Date(
            appointment.appointmentDate
          );

        const formattedDate =
          appointmentDate.toLocaleDateString(
            "ar-EG",
            {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }
          );

        const formattedTime =
          appointmentDate.toLocaleTimeString(
            "ar-EG",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
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
          message:
            whatsappMessage,
        });

        console.log(
          `📱 Appointment WhatsApp sent to ${
            whatsappGroup
              ? "WhatsApp Group"
              : adminNumber
          }`
        );
      }
    } catch (whatsappError) {
      /*
       * فشل WhatsApp لا يمنع
       * إنشاء الموعد.
       */

      console.error(
        "Appointment WhatsApp Error:",
        whatsappError
      );
    }

    /*
     * ============================
     * إرجاع الموعد
     * ============================
     */

    return NextResponse.json(
      appointment,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create Appointment Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create appointment",
      },
      {
        status: 500,
      }
    );
  }
}