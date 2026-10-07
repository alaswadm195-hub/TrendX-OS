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

const usageSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),

    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable(),
  })
  .strict();

const MAX_TRANSACTION_RETRIES = 3;
const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

function truncateOptional(
  value: string | null | undefined,
  maxLength: number,
) {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed
    ? trimmed.slice(0, maxLength)
    : null;
}

function isRetryableTransactionError(
  error: unknown,
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code ===
      "P2034"
  );
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    assertSameOrigin(req);

    const admin =
      await requireApiAdmin();

    const { id: rawId } =
      await params;

    const parsedId =
      idSchema.safeParse(rawId);

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Subscription not found",
      );
    }

    const body =
      await parseJson(
        req,
        usageSchema,
      );

    const startAt =
      new Date(body.startAt);

    const endAt =
      new Date(body.endAt);

    const durationMs =
      endAt.getTime() -
      startAt.getTime();

    const durationMinutes =
      Math.round(
        durationMs / 60000,
      );

    if (
      !Number.isFinite(
        startAt.getTime(),
      ) ||
      !Number.isFinite(
        endAt.getTime(),
      ) ||
      durationMs <= 0 ||
      durationMinutes <= 0 ||
      durationMinutes > 1440
    ) {
      throw new ApiError(
        400,
        "Invalid usage session time",
      );
    }

    const id = parsedId.data;

    const ipAddress =
      truncateOptional(
        getClientIp(req),
        MAX_IP_LENGTH,
      );

    const userAgent =
      truncateOptional(
        req.headers.get(
          "user-agent",
        ),
        MAX_USER_AGENT_LENGTH,
      );

    let result:
      | {
          usage: {
            id: string;
            startAt: Date;
            endAt: Date;
            durationMinutes: number;
            notes: string | null;
            createdAt: Date;
          };
          usedMinutes: number;
          remainingMinutes: number;
        }
      | undefined;

    for (
      let attempt = 1;
      attempt <=
      MAX_TRANSACTION_RETRIES;
      attempt += 1
    ) {
      try {
        result =
          await prisma.$transaction(
            async (tx) => {
              const subscription =
                await tx.subscription.findUnique(
                  {
                    where: {
                      id,
                    },

                    select: {
                      id: true,
                      status: true,
                      includedMinutes: true,
                    },
                  },
                );

              if (!subscription) {
                throw new ApiError(
                  404,
                  "Subscription not found",
                );
              }

              if (
                subscription.status ===
                "CANCELLED"
              ) {
                throw new ApiError(
                  409,
                  "Cancelled subscription cannot record usage",
                );
              }

              if (
                subscription.includedMinutes ===
                null
              ) {
                throw new ApiError(
                  409,
                  "Usage tracking is not enabled for this subscription",
                );
              }

              const overlapping =
                await tx.subscriptionUsage.findFirst(
                  {
                    where: {
                      subscriptionId:
                        id,
                      archivedAt: null,

                      startAt: {
                        lt: endAt,
                      },

                      endAt: {
                        gt: startAt,
                      },
                    },

                    select: {
                      id: true,
                    },
                  },
                );

              if (overlapping) {
                throw new ApiError(
                  409,
                  "This session overlaps an existing usage session",
                );
              }

              const aggregate =
                await tx.subscriptionUsage.aggregate(
                  {
                    where: {
                      subscriptionId:
                        id,
                      archivedAt: null,
                    },

                    _sum: {
                      durationMinutes:
                        true,
                    },
                  },
                );

              const usedBefore =
                aggregate._sum
                  .durationMinutes ??
                0;

              const usedAfter =
                usedBefore +
                durationMinutes;

              if (
                usedAfter >
                subscription.includedMinutes
              ) {
                throw new ApiError(
                  409,
                  `Only ${
                    subscription.includedMinutes -
                    usedBefore
                  } minutes remain in this package`,
                );
              }

              const usage =
                await tx.subscriptionUsage.create(
                  {
                    data: {
                      subscriptionId:
                        id,

                      startAt,
                      endAt,

                      durationMinutes,

                      notes:
                        body.notes ||
                        null,
                    },

                    select: {
                      id: true,
                      startAt: true,
                      endAt: true,
                      durationMinutes:
                        true,
                      notes: true,
                      createdAt: true,
                    },
                  },
                );

              const progress =
                await syncSubscriptionCompletion(
                  tx,
                  id,
                );

              await tx.auditLog.create({
                data: {
                  actorUserId:
                    admin.userId,

                  action:
                    "SUBSCRIPTION_USAGE_CREATE",

                  entityType:
                    "SubscriptionUsage",

                  entityId:
                    usage.id,

                  metadata: {
                    subscriptionId:
                      id,

                    startAt:
                      startAt.toISOString(),

                    endAt:
                      endAt.toISOString(),

                    durationMinutes,

                    usedBeforeMinutes:
                      usedBefore,

                    usedAfterMinutes:
                      usedAfter,

                    remainingMinutes:
                      subscription.includedMinutes -
                      usedAfter,

                    completed:
                      progress?.completed ??
                      false,
                  },

                  ipAddress,
                  userAgent,
                },
              });

              return {
                usage,
                usedMinutes:
                  usedAfter,
                remainingMinutes:
                  subscription.includedMinutes -
                  usedAfter,
              };
            },
            {
              isolationLevel:
                "Serializable",
            },
          );

        break;
      } catch (error) {
        if (
          isRetryableTransactionError(
            error,
          ) &&
          attempt <
            MAX_TRANSACTION_RETRIES
        ) {
          continue;
        }

        throw error;
      }
    }

    if (!result) {
      throw new ApiError(
        409,
        "Usage session could not be recorded",
      );
    }

    return NextResponse.json(
      result,
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(
      error,
      "Failed to record subscription usage",
    );
  }
}
