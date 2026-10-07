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

function parseOptional(value: string | null | undefined) {
  return value ? new Date(value) : null;
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
      throw new ApiError(
        400,
        "Content timeline dates cannot be before production",
      );
    }
  }

  if (editedAt && publishedAt && publishedAt < editedAt) {
    throw new ApiError(
      400,
      "Published date cannot be before edit completion",
    );
  }
}

export async function PATCH(
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

    const body = await parseJson(req, bodySchema);

    const producedAt = new Date(body.producedAt);
    const editedAt = parseOptional(body.editedAt);
    const scheduledAt = parseOptional(body.scheduledAt);
    const publishedAt = parseOptional(body.publishedAt);

    assertTimeline(producedAt, editedAt, scheduledAt, publishedAt);

    const status = deriveStatus({
      editedAt,
      scheduledAt,
      publishedAt,
    });

    const ipAddress = short(getClientIp(req), 100);
    const userAgent = short(req.headers.get("user-agent"), 500);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.subscriptionContentItem.findFirst({
        where: {
          id: itemId.data,
          subscriptionId: id.data,
          archivedAt: null,
        },
      });

      if (!existing) {
        throw new ApiError(404, "Content item not found");
      }

      const subscription = await tx.subscription.findUnique({
        where: { id: id.data },
        select: { status: true },
      });

      if (!subscription || subscription.status === "CANCELLED") {
        throw new ApiError(
          409,
          "Cancelled subscription cannot be changed",
        );
      }

      const updated = await tx.subscriptionContentItem.update({
        where: { id: existing.id },
        data: {
          producedAt,
          editedAt,
          scheduledAt,
          publishedAt,
          status,
          notes: body.notes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUBSCRIPTION_CONTENT_UPDATE",
          entityType: "SubscriptionContentItem",
          entityId: updated.id,
          metadata: {
            subscriptionId: id.data,
            contentType: existing.contentType,
            previousStatus: existing.status,
            newStatus: status,
            producedAt: producedAt.toISOString(),
            editedAt: editedAt?.toISOString() ?? null,
            scheduledAt: scheduledAt?.toISOString() ?? null,
            publishedAt: publishedAt?.toISOString() ?? null,
          },
          ipAddress,
          userAgent,
        },
      });

      return updated;
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Failed to update subscription content");
  }
}

export async function DELETE(
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

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.subscriptionContentItem.findFirst({
        where: {
          id: itemId.data,
          subscriptionId: id.data,
          archivedAt: null,
        },
      });

      if (!existing) {
        throw new ApiError(404, "Content item not found");
      }

      const archivedAt = new Date();

      const archived = await tx.subscriptionContentItem.update({
        where: { id: existing.id },
        data: { archivedAt },
      });

      const progress = await syncSubscriptionCompletion(
        tx,
        id.data,
      );

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUBSCRIPTION_CONTENT_ARCHIVE",
          entityType: "SubscriptionContentItem",
          entityId: existing.id,
          metadata: {
            subscriptionId: id.data,
            contentType: existing.contentType,
            previousStatus: existing.status,
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
    return apiError(error, "Failed to archive subscription content");
  }
}
