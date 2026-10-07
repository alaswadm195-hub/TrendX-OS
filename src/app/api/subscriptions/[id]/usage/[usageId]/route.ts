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

export async function DELETE(
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

    const result = await prisma.$transaction(async (tx) => {
      const usage = await tx.subscriptionUsage.findFirst({
        where: {
          id: usageId.data,
          subscriptionId: id.data,
          archivedAt: null,
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          durationMinutes: true,
          notes: true,
        },
      });

      if (!usage) {
        throw new ApiError(404, "Usage session not found");
      }

      const archivedAt = new Date();

      const archived = await tx.subscriptionUsage.update({
        where: { id: usage.id },
        data: { archivedAt },
      });

      const progress = await syncSubscriptionCompletion(
        tx,
        id.data,
      );

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUBSCRIPTION_USAGE_ARCHIVE",
          entityType: "SubscriptionUsage",
          entityId: usage.id,
          metadata: {
            subscriptionId: id.data,
            startAt: usage.startAt.toISOString(),
            endAt: usage.endAt.toISOString(),
            durationMinutes: usage.durationMinutes,
            archivedAt: archivedAt.toISOString(),
            completedAfterArchive: progress?.completed ?? false,
          },
          ipAddress,
          userAgent,
        },
      });

      return {
        success: true,
        archivedAt: archived.archivedAt,
      };
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to archive usage session");
  }
}
