import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  requireApiAdmin,
} from "@/lib/api-security";

const idSchema = z.string().cuid();

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; extraId: string }> },
) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const { id, extraId } = await params;

    if (!idSchema.safeParse(id).success || !idSchema.safeParse(extraId).success) {
      throw new ApiError(404, "Extra charge not found");
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: extraId, subscriptionId: id },
        select: { id: true, status: true, totalAmount: true, paidAmount: true },
      });

      if (!invoice) {
        throw new ApiError(404, "Extra charge not found");
      }
      if (invoice.status === "CANCELLED") {
        return { success: true, alreadyCancelled: true };
      }

      await tx.invoice.update({
        where: { id: extraId },
        data: { status: "CANCELLED" },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUBSCRIPTION_ADDON_VOID",
          entityType: "Invoice",
          entityId: extraId,
          metadata: {
            subscriptionId: id,
            previousStatus: invoice.status,
            totalAmount: Number(invoice.totalAmount),
            paidAmount: Number(invoice.paidAmount),
            reason: "INCORRECT_ENTRY",
          },
        },
      });

      // Existing payment entries are preserved for audit but excluded from
      // operational collections because their parent invoice is now CANCELLED.
      return { success: true, cancelled: true };
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to void package extra");
  }
}
