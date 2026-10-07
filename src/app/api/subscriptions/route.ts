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
import {
  parseJson,
  subscriptionSchema,
} from "@/lib/validation";

type MoneyValue =
  | number
  | {
      toString(): string;
    };

const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

function hasAtMostTwoDecimalPlaces(
  value: number,
) {
  return (
    Math.round(value * 100) /
      100 ===
    value
  );
}

const serviceCategorySchema = z.enum([
  "PAGE_MANAGEMENT",
  "SCREEN_PACKAGES",
  "OUTDOOR_SHOOTING",
  "INDOOR_SHOOTING",
]);

const subscriptionCreateSchema =
  subscriptionSchema
    .extend({
      serviceCategory:
        serviceCategorySchema,

      includedMinutes:
        z
          .number()
          .int()
          .min(1)
          .max(100000)
          .optional()
          .nullable(),

      reelsCount:
        z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .default(0),

      designsCount:
        z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .default(0),
    })
    .superRefine(
    (value, ctx) => {
      if (
        !hasAtMostTwoDecimalPlaces(
          value.totalAmount,
        )
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["totalAmount"],
          message:
            "Total amount must have at most 2 decimal places",
        });
      }

      if (
        !hasAtMostTwoDecimalPlaces(
          value.paidAmount,
        )
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["paidAmount"],
          message:
            "Paid amount must have at most 2 decimal places",
        });
      }
    },
  );

function moneyToNumber(
  value: MoneyValue,
) {
  const numericValue =
    typeof value === "number"
      ? value
      : Number(value.toString());

  if (!Number.isFinite(numericValue)) {
    throw new ApiError(
      409,
      "Invalid monetary value",
    );
  }

  return numericValue;
}

function toCents(
  value: MoneyValue,
) {
  const numericValue =
    moneyToNumber(value);

  const cents =
    Math.round(
      numericValue * 100,
    );

  if (!Number.isSafeInteger(cents)) {
    throw new ApiError(
      409,
      "Monetary value is out of range",
    );
  }

  return cents;
}

function fromCents(
  cents: number,
) {
  if (!Number.isSafeInteger(cents)) {
    throw new ApiError(
      409,
      "Monetary value is out of range",
    );
  }

  return cents / 100;
}

function addOneCalendarMonth(
  value: Date,
) {
  const year =
    value.getUTCFullYear();

  const month =
    value.getUTCMonth();

  const day =
    value.getUTCDate();

  const lastDayOfNextMonth =
    new Date(
      Date.UTC(
        year,
        month + 2,
        0,
      ),
    ).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month + 1,
      Math.min(
        day,
        lastDayOfNextMonth,
      ),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds(),
    ),
  );
}

function truncateOptional(
  value: string | null | undefined,
  maxLength: number,
) {
  if (!value) {
    return null;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(
    0,
    maxLength,
  );
}

function serializeSubscription<
  T extends {
    totalAmount: MoneyValue;
    paidAmount: MoneyValue;
    remainingAmount: MoneyValue;
  } & Record<string, unknown>,
>(subscription: T) {
  return {
    ...subscription,

    totalAmount:
      moneyToNumber(
        subscription.totalAmount,
      ),

    paidAmount:
      moneyToNumber(
        subscription.paidAmount,
      ),

    remainingAmount:
      moneyToNumber(
        subscription.remainingAmount,
      ),
  };
}

export async function GET() {
  try {
    await requireApiAdmin();

    const subscriptions =
      await prisma.subscription.findMany({
        include: {
          client: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const serializedSubscriptions =
      subscriptions.map(
        (subscription) =>
          serializeSubscription(
            subscription,
          ),
      );

    return NextResponse.json(
      serializedSubscriptions,
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
      "Failed to fetch subscriptions",
    );
  }
}

export async function POST(
  req: Request,
) {
  try {
    assertSameOrigin(req);

    const admin =
      await requireApiAdmin();

    const body =
      await parseJson(
        req,
        subscriptionCreateSchema,
      );

    const totalCents =
      toCents(
        body.totalAmount,
      );

    const paidCents =
      toCents(
        body.paidAmount,
      );

    if (
      totalCents <= 0 ||
      paidCents < 0 ||
      paidCents > totalCents
    ) {
      throw new ApiError(
        400,
        "Invalid subscription amounts",
      );
    }

    const remainingCents =
      totalCents -
      paidCents;

    const isScreenPackage =
      body.serviceCategory ===
      "SCREEN_PACKAGES";

    const isPageManagement =
      body.serviceCategory ===
      "PAGE_MANAGEMENT";

    if (
      isScreenPackage &&
      !body.includedMinutes
    ) {
      throw new ApiError(
        400,
        "Screen packages require included minutes",
      );
    }

    if (
      isPageManagement &&
      body.reelsCount +
        body.designsCount <=
        0
    ) {
      throw new ApiError(
        400,
        "Page management packages require at least one content item",
      );
    }

    const startDate =
      new Date(
        body.startDate,
      );

    const requestedEndDate =
      new Date(
        body.endDate,
      );

    const endDate =
      isScreenPackage ||
      isPageManagement
        ? addOneCalendarMonth(
            startDate,
          )
        : requestedEndDate;

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

    /*
     * Client validation, subscription creation, optional opening payment,
     * and their AuditLog records are committed atomically.
     */
    const subscription =
      await prisma.$transaction(
        async (tx) => {
          const client =
            await tx.client.findFirst({
              where: {
                id: body.clientId,
                archivedAt: null,
              },

              select: {
                id: true,
              },
            });

          if (!client) {
            throw new ApiError(
              400,
              "Invalid client",
            );
          }

          const createdSubscription =
            await tx.subscription.create(
              {
                data: {
                  clientId:
                    body.clientId,

                  serviceCategory:
                    body.serviceCategory,

                  planName:
                    body.planName,

                  includedMinutes:
                    isScreenPackage
                      ? body.includedMinutes ??
                        null
                      : null,

                  totalAmount:
                    fromCents(
                      totalCents,
                    ),

                  paidAmount:
                    fromCents(
                      paidCents,
                    ),

                  remainingAmount:
                    fromCents(
                      remainingCents,
                    ),

                  startDate,

                  endDate,

                  notes:
                    body.notes ||
                    null,

                  status:
                    body.status ||
                    "ACTIVE",
                },

                include: {
                  client: true,
                },
              },
            );

          if (
            isPageManagement
          ) {
            if (
              body.reelsCount > 0
            ) {
              await tx.subscriptionContentQuota.create({
                data: {
                  subscriptionId:
                    createdSubscription.id,
                  contentType:
                    "REEL",
                  totalCount:
                    body.reelsCount,
                },
              });
            }

            if (
              body.designsCount > 0
            ) {
              await tx.subscriptionContentQuota.create({
                data: {
                  subscriptionId:
                    createdSubscription.id,
                  contentType:
                    "DESIGN",
                  totalCount:
                    body.designsCount,
                },
              });
            }
          }

          await tx.auditLog.create({
            data: {
              actorUserId:
                admin.userId,

              action:
                "SUBSCRIPTION_CREATE",

              entityType:
                "Subscription",

              entityId:
                createdSubscription.id,

              metadata: {
                clientId:
                  body.clientId,

                serviceCategory:
                  body.serviceCategory,

                planName:
                  body.planName,

                includedMinutes:
                  isScreenPackage
                    ? body.includedMinutes ??
                      null
                    : null,

                reelsCount:
                  isPageManagement
                    ? body.reelsCount
                    : 0,

                designsCount:
                  isPageManagement
                    ? body.designsCount
                    : 0,

                totalAmount:
                  fromCents(
                    totalCents,
                  ),

                paidAmount:
                  fromCents(
                    paidCents,
                  ),

                remainingAmount:
                  fromCents(
                    remainingCents,
                  ),

                status:
                  body.status ||
                  "ACTIVE",
              },

              ipAddress,
              userAgent,
            },
          });

          if (paidCents > 0) {
            const openingPayment =
              await tx.payment.create({
                data: {
                  subscriptionId:
                    createdSubscription.id,

                  amount:
                    fromCents(
                      paidCents,
                    ),

                  notes: null,
                },
              });

            await tx.auditLog.create({
              data: {
                actorUserId:
                  admin.userId,

                action:
                  "PAYMENT_CREATE",

                entityType:
                  "Payment",

                entityId:
                  openingPayment.id,

                metadata: {
                  subscriptionId:
                    createdSubscription.id,

                  amount:
                    fromCents(
                      paidCents,
                    ),

                  previousPaidAmount:
                    0,

                  newPaidAmount:
                    fromCents(
                      paidCents,
                    ),

                  previousRemainingAmount:
                    fromCents(
                      totalCents,
                    ),

                  newRemainingAmount:
                    fromCents(
                      remainingCents,
                    ),

                  source:
                    "SUBSCRIPTION_OPENING_PAYMENT",
                },

                ipAddress,
                userAgent,
              },
            });
          }

          return createdSubscription;
        },
      );

    return NextResponse.json(
      serializeSubscription(
        subscription,
      ),
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
      "Failed to create subscription",
    );
  }
}
