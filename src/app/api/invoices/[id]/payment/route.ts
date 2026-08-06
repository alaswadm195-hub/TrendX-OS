import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { InvoiceStatus } from "@/generated/prisma/client";

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await params;

    const body = await req.json();

    const amount = Number(
      body.amount
    );

    const notes =
      body.notes || null;

    const invoice =
      await prisma.invoice.findUnique({
        where: {
          id,
        },
      });

    if (!invoice) {
      return NextResponse.json(
        {
          error:
            "Invoice not found",
        },
        { status: 404 }
      );
    }

    await prisma.invoicePayment.create({
      data: {
        invoiceId: id,
        amount,
        notes,
      },
    });

    const newPaid =
      invoice.paidAmount +
      amount;

    const newRemaining =
      Math.max(
        invoice.totalAmount -
          newPaid,
        0
      );

    let status: InvoiceStatus =
      InvoiceStatus.PENDING;

    let paidAt =
      invoice.paidAt;

    if (
      newPaid > 0 &&
      newPaid <
        invoice.totalAmount
    ) {
      status =
        InvoiceStatus.PARTIAL;
    }

    if (
      newPaid >=
      invoice.totalAmount
    ) {
      status =
        InvoiceStatus.PAID;

      if (!invoice.paidAt) {
        paidAt =
          new Date();
      }
    }

    await prisma.invoice.update({
      where: {
        id,
      },
      data: {
        paidAmount:
          newPaid,

        remainingAmount:
          newRemaining,

        status,

        paidAt,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to add payment",
      },
      { status: 500 }
    );
  }
}