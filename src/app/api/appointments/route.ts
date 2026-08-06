import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const appointments = await prisma.appointment.findMany({
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
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();

    const appointment = await prisma.appointment.create({
      data: {
        title: body.title,
        clientId: body.clientId,
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

    return NextResponse.json(appointment);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}