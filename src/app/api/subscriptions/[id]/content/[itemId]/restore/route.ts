import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  requireApiAdmin,
} from "@/lib/api-security";
import { getClientIp } from "@/lib/rate-limit";
import { syncSubscriptionCompletion } from "@/lib/subscription-progress";

const idSchema = z.string().cuid();

function short(value: string | null, max: number) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; itemId: string }>;
  },
) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();

    const { id: rawId, itemId: rawItemId } = await params;
    const id = idSchema.safeParse(rawId);
    const itemId = idSchema.safeParse(rawItemId);

    if (!id.success || !itemId.success) {
      throw new ApiError(404, "Content item not found");
    }

    const ipAddress = short(getClientIp(req), 100);
    const userAgent = short(req.headers.get("user-agent"), 500);

    const result = await prisma.$transaction(
      async (tx) => {
        const item = await tx.subscriptionContentItem.findFirst({
          where: {
            id: itemId.data,
            subscriptionId: id.data,
            archivedAt: { not: null },
          },
        });

        if (!item) {
          throw new ApiError(404, "Archived content item not found");
        }

        const subscription = await tx.subscription.findUnique({
          where: { id: id.data },
          select: {
            status: true,
            serviceCategory: true,
            contentQuotas: {
              where: {
                contentType: item.contentType,
              },
              select: {
                totalCount: true,
              },
            },
          },
        });

        if (!subscription) {
          throw new ApiError(404, "Subscription not found");
        }

        if (subscription.status === "CANCELLED") {
          throw new ApiError(
            409,
            "Cancelled subscription cannot restore content",
          );
        }

        if (subscription.serviceCategory !== "PAGE_MANAGEMENT") {
          throw new ApiError(
            409,
            "Content tracking is not enabled for this package",
          );
        }

        const quota = subscription.contentQuotas[0];

        if (!quota) {
          throw new ApiError(
            409,
            "No quota exists for this content type",
          );
        }

        const activeCount = await tx.subscriptionContentItem.count({
          where: {
            subscriptionId: id.data,
            contentType: item.contentType,
            archivedAt: null,
          },
        });

        if (activeCount >= quota.totalCount) {
          throw new ApiError(
            409,
            "Cannot restore: this content quota is already full",
          );
        }

        const restored = await tx.subscriptionContentItem.update({
          where: { id: item.id },
          data: { archivedAt: null },
        });

        const progress = await syncSubscriptionCompletion(
          tx,
          id.data,
        );

        await tx.auditLog.create({
          data: {
            actorUserId: admin.userId,
            action: "SUBSCRIPTION_CONTENT_RESTORE",
            entityType: "SubscriptionContentItem",
            entityId: item.id,
            metadata: {
              subscriptionId: id.data,
              contentType: item.contentType,
              previousArchivedAt: item.archivedAt?.toISOString() ?? null,
              completedAfterRestore: progress?.completed ?? false,
            },
            ipAddress,
            userAgent,
          },
        });

        return {
          success: true,
          item: restored,
        };
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to restore subscription content");
  }
}
