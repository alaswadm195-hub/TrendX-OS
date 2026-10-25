import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  requireApiAdmin,
} from "@/lib/api-security";
import { parseJson } from "@/lib/validation";

const idSchema = z.string().cuid();
const paymentMethodSchema = z.enum([
  "CASH", "INSTAPAY", "BANK_TRANSFER", "VODAFONE_CASH", "OTHER",
]);

const addonSchema = z.object({
  category: z.enum(["EXTRA_SHOOT", "URGENT_EDIT", "HOLIDAY_SHOOT", "OTHER"]),
  description: z.string().trim().max(500).optional().nullable(),
  totalAmount: z.number().finite().positive().max(100000000),
  paidAmount: z.number().finite().min(0).max(100000000),
  paymentMethod: paymentMethodSchema.default("OTHER"),
}).strict().superRefine((value, ctx) => {
  if (value.paidAmount > value.totalAmount) {
    ctx.addIssue({
      code: "custom",
      path: ["paidAmount"],
      message: "Paid amount cannot exceed total",
    });
  }
  for (const field of ["totalAmount", "paidAmount"] as const) {
    if (!Number.isSafeInteger(Math.round(value[field] * 100)) ||
        Math.abs(value[field] * 100 - Math.round(value[field] * 100)) > 0.000001) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "Amount must have no more than two decimal places",
      });
    }
  }
});

const categoryLabels = {
  EXTRA_SHOOT: "تصوير إضافي",
  URGENT_EDIT: "مونتاج مستعجل",
  HOLIDAY_SHOOT: "تصوير يوم إجازة / الجمعة",
  OTHER: "خدمة إضافية",
} as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      throw new ApiError(404, "Subscription not found");
    }

    const body = await parseJson(req, addonSchema);
    const totalCents = Math.round(body.totalAmount * 100);
    const paidCents = Math.round(body.paidAmount * 100);
    const remainingCents = totalCents - paidCents;
    const status =
      paidCents === 0 ? "PENDING" :
      remainingCents === 0 ? "PAID" : "PARTIAL";

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          clientId: true,
          planName: true,
          client: { select: { name: true, phone: true } },
        },
      });

      if (!subscription) {
        throw new ApiError(404, "Subscription not found");
      }
      if (subscription.status === "CANCELLED") {
        throw new ApiError(409, "Cannot add charges to a cancelled package");
      }

      // This is a separate financial invoice linked to the specific package.
      // It must NOT alter included hours or duplicate amounts in base package.
      const invoice = await tx.invoice.create({
        data: {
          clientId: subscription.clientId,
          subscriptionId: subscription.id,
          customerName: subscription.client.name,
          customerPhone: subscription.client.phone,
          title: categoryLabels[body.category],
          description: body.description || null,
          totalAmount: totalCents / 100,
          paidAmount: paidCents / 100,
          remainingAmount: remainingCents / 100,
          status,
          paidAt: status === "PAID" ? new Date() : null,
        },
      });

      if (paidCents > 0) {
        await tx.invoicePayment.create({
          data: {
            invoiceId: invoice.id,
            amount: paidCents / 100,
            paymentMethod: body.paymentMethod,
            notes: "دفعة خدمة إضافية مرتبطة بباقة",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUBSCRIPTION_ADDON_CREATE",
          entityType: "Invoice",
          entityId: invoice.id,
          metadata: {
            subscriptionId: subscription.id,
            category: body.category,
            totalAmount: totalCents / 100,
            paidAmount: paidCents / 100,
            invoiceId: invoice.id,
          },
        },
      });

      return { id: invoice.id, title: invoice.title, status: invoice.status };
    });

    return NextResponse.json({ success: true, invoice: result }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to add subscription extra");
  }
}
