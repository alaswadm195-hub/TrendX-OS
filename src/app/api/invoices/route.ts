import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { InvoiceStatus } from "@/generated/prisma/client";

export async function GET() {
  const invoices =
    await prisma.invoice.findMany({
      include: {
        client: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return NextResponse.json(
    invoices
  );
}

export async function POST(
  req: Request
) {
  try {
    const body =
      await req.json();

    const {
      clientId,
      customerName,
      customerPhone,
      title,
      description,
      totalAmount,
      paidAmount,
    } = body;

    const total =
      Number(totalAmount);

    const paid = Number(
      paidAmount || 0
    );

    const remaining =
      Math.max(
        total - paid,
        0
      );

    let status: InvoiceStatus =
      InvoiceStatus.PENDING;

    if (
      paid > 0 &&
      paid < total
    ) {
      status =
        InvoiceStatus.PARTIAL;
    }

    if (paid >= total) {
      status =
        InvoiceStatus.PAID;
    }

    const invoice =
      await prisma.invoice.create({
        data: {
          clientId:
            clientId || null,

          customerName:
            customerName ||
            null,

          customerPhone:
            customerPhone ||
            null,

          title,

          description,

          totalAmount:
            total,

          paidAmount:
            paid,

          remainingAmount:
            remaining,

          status,

          paidAt:
            status ===
            InvoiceStatus.PAID
              ? new Date()
              : null,
        },
      });

    if (paid > 0) {
      await prisma.invoicePayment.create({
        data: {
          invoiceId:
            invoice.id,

          amount: paid,

          notes:
            "دفعة عند إنشاء الفاتورة",
        },
      });
    }

    return NextResponse.json(
      invoice
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to create invoice",
      },
      {
        status: 500,
      }
    );
  }
}