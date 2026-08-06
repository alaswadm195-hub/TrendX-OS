import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const subscription =
      await prisma.subscription.findUnique({
        where: { id },
        include: {
          client: true,
        },
      });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated =
      await prisma.subscription.update({
        where: { id },
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

          status: body.status,
        },
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.subscription.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}