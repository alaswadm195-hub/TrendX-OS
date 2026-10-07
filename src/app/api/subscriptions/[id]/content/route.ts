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
const contentTypeSchema = z.enum(["REEL", "DESIGN"]);

const bodySchema = z
  .object({
    contentType: contentTypeSchema,
    producedAt: z.string().datetime(),
    editedAt: z.string().datetime().optional().nullable(),
    scheduledAt: z.string().datetime().optional().nullable(),
    publishedAt: z.string().datetime().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

function short(value: string | null, max: number) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function deriveStatus(input: {
  editedAt: Date | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
}) {
  if (input.publishedAt) return "PUBLISHED" as const;
  if (input.scheduledAt) return "SCHEDULED" as const;
  if (input.editedAt) return "READY" as const;
  return "PRODUCED" as const;
}

function parseOptional(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function assertTimeline(
  producedAt: Date,
  editedAt: Date | null,
  scheduledAt: Date | null,
  publishedAt: Date | null,
) {
  if (!Number.isFinite(producedAt.getTime())) {
    throw new ApiError(400, "Invalid produced date");
  }

  for (const date of [editedAt, scheduledAt, publishedAt]) {
    if (date && (!Number.isFinite(date.getTime()) || date < producedAt)) {
      throw new ApiError(400, "Content timeline dates cannot be before production");
    }
  }

  if (editedAt && publishedAt && publishedAt < editedAt) {
    throw new ApiError(400, "Published date cannot be before edit completion");
  }
}

export async function POST(
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

    const producedAt = new Date(body.producedAt);
    const editedAt = parseOptional(body.editedAt);
    const scheduledAt = parseOptional(body.scheduledAt);
    const publishedAt = parseOptional(body.publishedAt);
    assertTimeline(producedAt, editedAt, scheduledAt, publishedAt);

    const ipAddress = short(getClientIp(req), 100);
    const userAgent = short(req.headers.get("user-agent"), 500);

    const result = await prisma.$transaction(
      async (tx) => {
        const subscription = await tx.subscription.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            serviceCategory: true,
            contentQuotas: {
              where: { contentType: body.contentType },
              select: { totalCount: true },
            },
          },
        });

        if (!subscription) {
          throw new ApiError(404, "Subscription not found");
        }

        if (subscription.status === "CANCELLED") {
          throw new ApiError(409, "Cancelled subscription cannot record content");
        }

        if (subscription.serviceCategory !== "PAGE_MANAGEMENT") {
          throw new ApiError(409, "Content tracking is only available for page management packages");
        }

        const quota = subscription.contentQuotas[0];
        if (!quota) {
          throw new ApiError(409, "No quota exists for this content type");
        }

        const usedCount = await tx.subscriptionContentItem.count({
          where: {
            subscriptionId: id,
            contentType: body.contentType,
            archivedAt: null,
          },
        });

        if (usedCount >= quota.totalCount) {
          throw new ApiError(409, "This content quota is already fully consumed");
        }

        const status = deriveStatus({ editedAt, scheduledAt, publishedAt });

        const item = await tx.subscriptionContentItem.create({
          data: {
            subscriptionId: id,
            contentType: body.contentType,
            status,
            producedAt,
            editedAt,
            scheduledAt,
            publishedAt,
            notes: body.notes || null,
          },
        });

        const progress = await syncSubscriptionCompletion(tx, id);

        await tx.auditLog.create({
          data: {
            actorUserId: admin.userId,
            action: "SUBSCRIPTION_CONTENT_CREATE",
            entityType: "SubscriptionContentItem",
            entityId: item.id,
            metadata: {
              subscriptionId: id,
              contentType: body.contentType,
              status,
              producedAt: producedAt.toISOString(),
              editedAt: editedAt?.toISOString() ?? null,
              scheduledAt: scheduledAt?.toISOString() ?? null,
              publishedAt: publishedAt?.toISOString() ?? null,
              usedAfter: usedCount + 1,
              quota: quota.totalCount,
              completed: progress?.completed ?? false,
            },
            ipAddress,
            userAgent,
          },
        });

        return {
          item,
          usedCount: usedCount + 1,
          remainingCount: quota.totalCount - usedCount - 1,
          completedAt: progress?.completedAt ?? null,
        };
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to record subscription content");
  }
}
