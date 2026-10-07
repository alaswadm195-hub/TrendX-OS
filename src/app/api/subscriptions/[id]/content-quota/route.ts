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
import { parseJson } from "@/lib/validation";
import { syncSubscriptionCompletion } from "@/lib/subscription-progress";

const idSchema = z.string().cuid();

const bodySchema = z
  .object({
    reelsCount: z.number().int().min(0).max(100),
    designsCount: z.number().int().min(0).max(100),
  })
  .strict()
  .refine(
    (value) => value.reelsCount + value.designsCount > 0,
    {
      message: "At least one content quota is required",
    },
  );

function short(value: string | null, max: number) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const { id: rawId } = await params;
    const parsed = idSchema.safeParse(rawId);

    if (!parsed.success) {
      throw new ApiError(404, "Subscription not found");
    }

    const body = await parseJson(req, bodySchema);
    const id = parsed.data;

    const ipAddress = short(getClientIp(req), 100);
    const userAgent = short(req.headers.get("user-agent"), 500);

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          serviceCategory: true,
          contentQuotas: {
            select: {
              contentType: true,
              totalCount: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new ApiError(404, "Subscription not found");
      }

      if (subscription.status === "CANCELLED") {
        throw new ApiError(409, "Cancelled subscription cannot be changed");
      }

      if (subscription.serviceCategory !== "PAGE_MANAGEMENT") {
        throw new ApiError(409, "Content quota is only available for page management packages");
      }

      const groups = await tx.subscriptionContentItem.groupBy({
        by: ["contentType"],
        where: {
          subscriptionId: id,
          archivedAt: null,
        },
        _count: { _all: true },
      });

      const used = new Map(groups.map((group) => [group.contentType, group._count._all]));
      const usedReels = used.get("REEL") ?? 0;
      const usedDesigns = used.get("DESIGN") ?? 0;

      if (body.reelsCount < usedReels) {
        throw new ApiError(409, `Reels quota cannot be lower than ${usedReels}`);
      }

      if (body.designsCount < usedDesigns) {
        throw new ApiError(409, `Designs quota cannot be lower than ${usedDesigns}`);
      }

      const previous = Object.fromEntries(
        subscription.contentQuotas.map((quota) => [quota.contentType, quota.totalCount]),
      );

      for (const [contentType, totalCount] of [
        ["REEL", body.reelsCount] as const,
        ["DESIGN", body.designsCount] as const,
      ]) {
        if (totalCount > 0) {
          await tx.subscriptionContentQuota.upsert({
            where: {
              subscriptionId_contentType: {
                subscriptionId: id,
                contentType,
              },
            },
            create: {
              subscriptionId: id,
              contentType,
              totalCount,
            },
            update: {
              totalCount,
            },
          });
        } else {
          await tx.subscriptionContentQuota.deleteMany({
            where: {
              subscriptionId: id,
              contentType,
            },
          });
        }
      }

      const progress = await syncSubscriptionCompletion(tx, id);

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUBSCRIPTION_CONTENT_QUOTA_UPDATE",
          entityType: "Subscription",
          entityId: id,
          metadata: {
            before: previous,
            after: {
              REEL: body.reelsCount,
              DESIGN: body.designsCount,
            },
            used: {
              REEL: usedReels,
              DESIGN: usedDesigns,
            },
            completed: progress?.completed ?? false,
          },
          ipAddress,
          userAgent,
        },
      });

      return {
        reelsCount: body.reelsCount,
        designsCount: body.designsCount,
        usedReels,
        usedDesigns,
        completedAt: progress?.completedAt ?? null,
      };
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to update content quota");
  }
}
