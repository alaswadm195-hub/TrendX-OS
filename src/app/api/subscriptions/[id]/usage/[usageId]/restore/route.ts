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

function short(
  value: string | null | undefined,
  maxLength: number,
) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      usageId: string;
    }>;
  },
) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();

    const {
      id: rawId,
      usageId: rawUsageId,
    } = await params;

    const id = idSchema.safeParse(rawId);
    const usageId = idSchema.safeParse(rawUsageId);

    if (!id.success || !usageId.success) {
      throw new ApiError(404, "Usage session not found");
    }

    const ipAddress = short(getClientIp(req), 100);
    const userAgent = short(req.headers.get("user-agent"), 500);

    const result = await prisma.$transaction(
      async (tx) => {
        const usage = await tx.subscriptionUsage.findFirst({
          where: {
            id: usageId.data,
            subscriptionId: id.data,
            archivedAt: { not: null },
          },
        });

        if (!usage) {
          throw new ApiError(404, "Archived usage session not found");
        }

        const subscription = await tx.subscription.findUnique({
          where: { id: id.data },
          select: {
            status: true,
            includedMinutes: true,
          },
        });

        if (!subscription) {
          throw new ApiError(404, "Subscription not found");
        }

        if (subscription.status === "CANCELLED") {
          throw new ApiError(
            409,
            "Cancelled subscription cannot restore usage",
          );
        }

        if (subscription.includedMinutes === null) {
          throw new ApiError(
            409,
            "Usage tracking is not enabled for this subscription",
          );
        }

        const overlapping = await tx.subscriptionUsage.findFirst({
          where: {
            subscriptionId: id.data,
            archivedAt: null,
            id: { not: usage.id },
            startAt: { lt: usage.endAt },
            endAt: { gt: usage.startAt },
          },
          select: { id: true },
        });

        if (overlapping) {
          throw new ApiError(
            409,
            "Cannot restore: this session overlaps an active session",
          );
        }

        const aggregate = await tx.subscriptionUsage.aggregate({
          where: {
            subscriptionId: id.data,
            archivedAt: null,
          },
          _sum: {
            durationMinutes: true,
          },
        });

        const usedMinutes =
          aggregate._sum.durationMinutes ?? 0;

        if (
          usedMinutes + usage.durationMinutes >
          subscription.includedMinutes
        ) {
          throw new ApiError(
            409,
            "Cannot restore: package time would exceed its limit",
          );
        }

        const restored = await tx.subscriptionUsage.update({
          where: { id: usage.id },
          data: { archivedAt: null },
        });

        const progress = await syncSubscriptionCompletion(
          tx,
          id.data,
        );

        await tx.auditLog.create({
          data: {
            actorUserId: admin.userId,
            action: "SUBSCRIPTION_USAGE_RESTORE",
            entityType: "SubscriptionUsage",
            entityId: usage.id,
            metadata: {
              subscriptionId: id.data,
              durationMinutes: usage.durationMinutes,
              previousArchivedAt: usage.archivedAt?.toISOString() ?? null,
              completedAfterRestore: progress?.completed ?? false,
            },
            ipAddress,
            userAgent,
          },
        });

        return {
          success: true,
          usage: restored,
        };
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to restore usage session");
  }
}
