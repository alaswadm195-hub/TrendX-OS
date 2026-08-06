import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getCurrentUser } from "@/lib/current-user";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const appointment =
      await prisma.appointment.findUnique({
        where: { id },
        include: {
          client: true,
          employee: {
            include: {
              user: true,
            },
          },
        },
      });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await req.json();

    console.log("PATCH BODY:", body);

    const currentAppointment =
      await prisma.appointment.findUnique({
        where: { id },
      });

    if (!currentAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const previousStatus =
      currentAppointment.status;

    const appointment =
      await prisma.appointment.update({
        where: { id },

        data: {
          ...(body.title !== undefined && {
            title: body.title,
          }),

          ...(body.clientId !== undefined && {
            clientId: body.clientId,
          }),

          ...(body.employeeId !== undefined && {
            employeeId:
              body.employeeId || null,
          }),

          ...(body.customerName !== undefined && {
            customerName:
              body.customerName || null,
          }),

          ...(body.customerPhone !== undefined && {
            customerPhone:
              body.customerPhone || null,
          }),

          ...(body.appointmentDate !==
            undefined && {
            appointmentDate: new Date(
              body.appointmentDate
            ),
          }),

          ...(body.endDate !==
            undefined && {
            endDate: body.endDate
              ? new Date(body.endDate)
              : null,
          }),

          ...(body.location !== undefined && {
            location:
              body.location || null,
          }),

          ...(body.meetingLink !==
            undefined && {
            meetingLink:
              body.meetingLink || null,
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
              user: true,
            },
          },
        },
      });

    console.log(
      "PREVIOUS STATUS:",
      previousStatus
    );

    console.log(
      "CURRENT STATUS:",
      appointment.status
    );

    console.log(
      "CUSTOMER PHONE:",
      appointment.customerPhone
    );

    if (
      previousStatus !== "CONFIRMED" &&
      appointment.status ===
        "CONFIRMED" &&
      appointment.customerPhone
    ) {
      console.log(
        "ENTERING WHATSAPP BLOCK"
      );

      try {
        await sendWhatsAppMessage({
          to: appointment.customerPhone,
          message: `تم تأكيد موعدك مع TrendX

📅 التاريخ:
${new Date(
  appointment.appointmentDate
).toLocaleDateString("ar-EG")}

⏰ الوقت:
${new Date(
  appointment.appointmentDate
).toLocaleTimeString("ar-EG")}

📍 المكان:
${appointment.location || "سيتم تحديده لاحقاً"}

شكراً لتعاملك معنا ❤️`,
        });

        console.log(
          "WHATSAPP SENT SUCCESSFULLY"
        );
      } catch (whatsappError) {
        console.error(
          "WHATSAPP ERROR:",
          whatsappError
        );
      }
    }

    return NextResponse.json(
      appointment
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to update appointment",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    await prisma.appointment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to delete appointment",
      },
      { status: 500 }
    );
  }
}