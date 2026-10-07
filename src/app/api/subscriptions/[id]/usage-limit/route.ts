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
    includedMinutes: z
      .number()
      .int()
      .min(1)
      .max(100000),
  })
  .strict();

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

export async function PATCH(
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
        bodySchema,
      );

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

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const [
            subscription,
            aggregate,
          ] =
            await Promise.all([
              tx.subscription.findUnique(
                {
                  where: {
                    id,
                  },

                  select: {
                    id: true,
                    includedMinutes:
                      true,
                  },
                },
              ),

              tx.subscriptionUsage.aggregate(
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
              ),
            ]);

          if (!subscription) {
            throw new ApiError(
              404,
              "Subscription not found",
            );
          }

          const usedMinutes =
            aggregate._sum
              .durationMinutes ??
            0;

          if (
            body.includedMinutes <
            usedMinutes
          ) {
            throw new ApiError(
              409,
              "Package limit cannot be lower than recorded usage",
            );
          }

          const result =
            await tx.subscription.update(
              {
                where: {
                  id,
                },

                data: {
                  includedMinutes:
                    body.includedMinutes,
                },

                select: {
                  id: true,
                  includedMinutes:
                    true,
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
                "SUBSCRIPTION_USAGE_LIMIT_UPDATE",

              entityType:
                "Subscription",

              entityId: id,

              metadata: {
                previousIncludedMinutes:
                  subscription.includedMinutes,

                newIncludedMinutes:
                  body.includedMinutes,

                usedMinutes,
              },

              ipAddress,
              userAgent,
            },
          });

          return {
            ...result,
            usedMinutes,
            remainingMinutes:
              body.includedMinutes -
              usedMinutes,

            completedAt:
              progress?.completedAt ??
              null,
          };
        },
      );

    return NextResponse.json(
      updated,
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(
      error,
      "Failed to update usage limit",
    );
  }
}
