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

    const subscriptions =
      await prisma.subscription.findMany({
        include: {
          client: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
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

    const subscription =
      await prisma.subscription.create({
        data: {
          clientId: body.clientId,
          planName: body.planName,

          totalAmount: Number(
            body.totalAmount
          ),

          paidAmount: Number(
            body.paidAmount || 0
          ),

          remainingAmount:
            Number(body.totalAmount) -
            Number(body.paidAmount || 0),

          startDate: new Date(
            body.startDate
          ),

          endDate: new Date(
            body.endDate
          ),

          notes: body.notes || null,

          status: "ACTIVE",
        },
      });

    return NextResponse.json(
      subscription
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}