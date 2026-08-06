import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const {
      subscriptionId,
      amount,
      notes,
    } = body;

    const subscription =
      await prisma.subscription.findUnique({
        where: {
          id: subscriptionId,
        },
      });

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "Subscription not found",
        },
        { status: 404 }
      );
    }

    const payment =
      await prisma.payment.create({
        data: {
          subscriptionId,
          amount: Number(amount),
          notes,
        },
      });

    const newPaidAmount =
      subscription.paidAmount +
      Number(amount);

    const newRemainingAmount =
      Math.max(
        subscription.totalAmount -
          newPaidAmount,
        0
      );

    await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        paidAmount:
          newPaidAmount,
        remainingAmount:
          newRemainingAmount,
      },
    });

    return NextResponse.json(
      payment
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to create payment",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const payments =
    await prisma.payment.findMany({
      include: {
        subscription: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

  return NextResponse.json(
    payments
  );
}