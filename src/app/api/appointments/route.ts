import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
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

    return NextResponse.json(
      appointments
    );
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
     *
     * عندنا حالتين:
     *
     * 1. clientId موجود
     *    → العميل موجود بالفعل.
     *
     * 2. newClient موجود
     *    → نعمل عميل جديد.
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
                  name: body.newClient.name.trim(),

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
           * لو العميل موجود،
           * نتأكد إنه موجود فعلًا.
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