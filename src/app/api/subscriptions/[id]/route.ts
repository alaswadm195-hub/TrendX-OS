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
import {
  parseJson,
  subscriptionSchema,
} from "@/lib/validation";

type MoneyValue =
  | number
  | {
      toString(): string;
    };

const subscriptionIdSchema =
  z.string().cuid();

const MAX_TRANSACTION_RETRIES = 3;
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

const subscriptionUpdateSchema =
  subscriptionSchema
    .extend({
      serviceCategory:
        serviceCategorySchema.optional(),

      includedMinutes:
        z
          .number()
          .int()
          .min(1)
          .max(100000)
          .optional()
          .nullable(),
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

function isRetryableTransactionError(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown })
      .code === "P2034"
  );
}

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
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  const lastDayOfNextMonth = new Date(
    Date.UTC(year, month + 2, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month + 1,
      Math.min(day, lastDayOfNextMonth),
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
    payments?: Array<
      {
        amount: MoneyValue;
      } & Record<string, unknown>
    >;
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

    ...(subscription.payments
      ? {
          payments:
            subscription.payments.map(
              (payment) => ({
                ...payment,

                amount:
                  moneyToNumber(
                    payment.amount,
                  ),
              }),
            ),
        }
      : {}),
  };
}

export async function GET(
  _: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    await requireApiAdmin();

    const {
      id: rawId,
    } = await params;

    const parsedId =
      subscriptionIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Subscription not found",
      );
    }

    const item =
      await prisma.subscription.findUnique(
        {
          where: {
            id: parsedId.data,
          },

          include: {
            client: true,

            payments: {
              orderBy: {
                paymentDate: "desc",
              },
            },
          },
        },
      );

    if (!item) {
      throw new ApiError(
        404,
        "Subscription not found",
      );
    }

    return NextResponse.json(
      serializeSubscription(
        item,
      ),
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
      "Failed to fetch subscription",
    );
  }
}

export async function PUT(
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

    const {
      id: rawId,
    } = await params;

    const parsedId =
      subscriptionIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Subscription not found",
      );
    }

    const body =
      await parseJson(
        req,
        subscriptionUpdateSchema,
      );

    const id =
      parsedId.data;

    const totalCents =
      toCents(
        body.totalAmount,
      );

    const requestedPaidCents =
      toCents(
        body.paidAmount,
      );

    if (
      totalCents <= 0 ||
      requestedPaidCents < 0 ||
      requestedPaidCents >
        totalCents
    ) {
      throw new ApiError(
        400,
        "Invalid subscription amounts",
      );
    }

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

    let updatedSubscription:
      | Awaited<
          ReturnType<
            typeof prisma.subscription.update
          >
        >
      | undefined;

    for (
      let attempt = 1;
      attempt <=
      MAX_TRANSACTION_RETRIES;
      attempt += 1
    ) {
      try {
        updatedSubscription =
          await prisma.$transaction(
            async (tx) => {
              const [
                existingSubscription,
                client,
              ] =
                await Promise.all([
                  tx.subscription.findUnique(
                    {
                      where: {
                        id,
                      },

                      select: {
                        id: true,
                        clientId: true,
                        serviceCategory: true,
                        planName: true,
                        includedMinutes: true,
                        completedAt: true,
                        totalAmount: true,
                        paidAmount: true,
                        remainingAmount: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                      },
                    },
                  ),

                  tx.client.findFirst({
                    where: {
                      id: body.clientId,
                      archivedAt: null,
                    },

                    select: {
                      id: true,
                    },
                  }),
                ]);

              if (
                !existingSubscription
              ) {
                throw new ApiError(
                  404,
                  "Subscription not found",
                );
              }

              if (!client) {
                throw new ApiError(
                  400,
                  "Invalid client",
                );
              }

              /*
               * Payment rows are the durable financial ledger.
               * paidAmount is an aggregate cache only and must always match
               * the exact sum of persisted Payment rows.
               *
               * Any change to paidAmount must therefore happen through the
               * dedicated payment flow, never through subscription editing.
               */
              const [
                paymentAggregate,
                usageAggregate,
                contentItemsCount,
                contentQuotasCount,
              ] = await Promise.all([
                tx.payment.aggregate({
                  where: {
                    subscriptionId:
                      id,
                  },

                  _sum: {
                    amount: true,
                  },
                }),

                tx.subscriptionUsage.aggregate({
                  where: {
                    subscriptionId:
                      id,
                  },

                  _sum: {
                    durationMinutes:
                      true,
                  },
                }),

                tx.subscriptionContentItem.count({
                  where: {
                    subscriptionId: id,
                  },
                }),

                tx.subscriptionContentQuota.count({
                  where: {
                    subscriptionId: id,
                  },
                }),
              ]);

              const usedMinutes =
                usageAggregate._sum
                  .durationMinutes ??
                0;

              const finalCategory =
                body.serviceCategory ??
                existingSubscription.serviceCategory;

              if (
                body.serviceCategory &&
                body.serviceCategory !==
                  existingSubscription.serviceCategory &&
                (
                  usedMinutes > 0 ||
                  contentItemsCount > 0 ||
                  contentQuotasCount > 0 ||
                  existingSubscription.includedMinutes !==
                    null
                )
              ) {
                throw new ApiError(
                  409,
                  "Service category cannot be changed after package tracking is configured",
                );
              }

              if (
                body.includedMinutes ===
                  null &&
                usedMinutes > 0
              ) {
                throw new ApiError(
                  409,
                  "Cannot disable usage tracking while usage sessions exist",
                );
              }

              if (
                typeof body.includedMinutes ===
                  "number" &&
                body.includedMinutes <
                  usedMinutes
              ) {
                throw new ApiError(
                  409,
                  "Included minutes cannot be lower than recorded usage",
                );
              }

              const recordedPaymentsCents =
                paymentAggregate._sum
                  .amount === null
                  ? 0
                  : toCents(
                      paymentAggregate
                        ._sum.amount,
                    );

              if (
                requestedPaidCents !==
                recordedPaymentsCents
              ) {
                throw new ApiError(
                  409,
                  "Paid amount must match recorded payments",
                );
              }

              if (
                recordedPaymentsCents >
                totalCents
              ) {
                throw new ApiError(
                  409,
                  "Total amount cannot be lower than recorded payments",
                );
              }

              const remainingCents =
                totalCents -
                recordedPaymentsCents;

              const startDate =
                new Date(
                  body.startDate,
                );

              const requestedEndDate =
                new Date(
                  body.endDate,
                );

              const endDate =
                finalCategory ===
                  "SCREEN_PACKAGES" ||
                finalCategory ===
                  "PAGE_MANAGEMENT"
                  ? addOneCalendarMonth(
                      startDate,
                    )
                  : requestedEndDate;

              const updated =
                await tx.subscription.update(
                  {
                    where: {
                      id,
                    },

                    data: {
                      clientId:
                        body.clientId,

                      serviceCategory:
                        finalCategory,

                      planName:
                        body.planName,

                      includedMinutes:
                        finalCategory ===
                        "SCREEN_PACKAGES"
                          ? body.includedMinutes ??
                            existingSubscription.includedMinutes
                          : null,

                      totalAmount:
                        fromCents(
                          totalCents,
                        ),

                      paidAmount:
                        fromCents(
                          recordedPaymentsCents,
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

                      payments: {
                        orderBy: {
                          paymentDate:
                            "desc",
                        },
                      },
                    },
                  },
                );

              await syncSubscriptionCompletion(
                tx,
                id,
              );

              /*
               * Keep the audit record in the same transaction as the update.
               * Notes are intentionally excluded from metadata.
               */
              await tx.auditLog.create({
                data: {
                  actorUserId:
                    admin.userId,

                  action:
                    "SUBSCRIPTION_UPDATE",

                  entityType:
                    "Subscription",

                  entityId:
                    id,

                  metadata: {
                    before: {
                      clientId:
                        existingSubscription.clientId,

                      serviceCategory:
                        existingSubscription.serviceCategory,

                      planName:
                        existingSubscription.planName,

                      includedMinutes:
                        existingSubscription.includedMinutes,

                      totalAmount:
                        moneyToNumber(
                          existingSubscription.totalAmount,
                        ),

                      paidAmount:
                        moneyToNumber(
                          existingSubscription.paidAmount,
                        ),

                      remainingAmount:
                        moneyToNumber(
                          existingSubscription.remainingAmount,
                        ),

                      startDate:
                        existingSubscription.startDate.toISOString(),

                      endDate:
                        existingSubscription.endDate.toISOString(),

                      status:
                        existingSubscription.status,
                    },

                    after: {
                      clientId:
                        updated.clientId,

                      serviceCategory:
                        updated.serviceCategory,

                      planName:
                        updated.planName,

                      includedMinutes:
                        updated.includedMinutes,

                      totalAmount:
                        moneyToNumber(
                          updated.totalAmount,
                        ),

                      paidAmount:
                        moneyToNumber(
                          updated.paidAmount,
                        ),

                      remainingAmount:
                        moneyToNumber(
                          updated.remainingAmount,
                        ),

                      startDate:
                        updated.startDate.toISOString(),

                      endDate:
                        updated.endDate.toISOString(),

                      status:
                        updated.status,
                    },

                    recordedPaymentsAmount:
                      fromCents(
                        recordedPaymentsCents,
                      ),
                  },

                  ipAddress,
                  userAgent,
                },
              });

              return updated;
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

    if (!updatedSubscription) {
      throw new ApiError(
        409,
        "Subscription could not be updated",
      );
    }

    return NextResponse.json(
      serializeSubscription(
        updatedSubscription,
      ),
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
      "Failed to update subscription",
    );
  }
}

export async function DELETE(
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

    const {
      id: rawId,
    } = await params;

    const parsedId =
      subscriptionIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Subscription not found",
      );
    }

    const id =
      parsedId.data;

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

    const result =
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
                  clientId: true,
                  serviceCategory:
                    true,
                  planName: true,
                  includedMinutes:
                    true,
                  completedAt:
                    true,
                  totalAmount: true,
                  paidAmount: true,
                  remainingAmount:
                    true,
                  startDate: true,
                  endDate: true,
                  status: true,
                },
              },
            );

          if (!subscription) {
            throw new ApiError(
              404,
              "Subscription not found",
            );
          }

          const [
            paymentsCount,
            usageSessionsCount,
            contentItemsCount,
            contentQuotasCount,
          ] =
            await Promise.all([
              tx.payment.count({
                where: {
                  subscriptionId:
                    id,
                },
              }),

              tx.subscriptionUsage.count(
                {
                  where: {
                    subscriptionId:
                      id,
                  },
                },
              ),

              tx.subscriptionContentItem.count({
                where: {
                  subscriptionId: id,
                },
              }),

              tx.subscriptionContentQuota.count({
                where: {
                  subscriptionId: id,
                },
              }),
            ]);

          const hasHistory =
            paymentsCount > 0 ||
            usageSessionsCount > 0 ||
            contentItemsCount > 0;

          if (hasHistory) {
            if (
              subscription.status !==
              "CANCELLED"
            ) {
              await tx.subscription.update(
                {
                  where: {
                    id,
                  },

                  data: {
                    status:
                      "CANCELLED",
                  },
                },
              );

              await tx.auditLog.create({
                data: {
                  actorUserId:
                    admin.userId,

                  action:
                    "SUBSCRIPTION_CANCEL",

                  entityType:
                    "Subscription",

                  entityId:
                    id,

                  metadata: {
                    clientId:
                      subscription.clientId,

                    serviceCategory:
                      subscription.serviceCategory,

                    planName:
                      subscription.planName,

                    includedMinutes:
                      subscription.includedMinutes,

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

                    previousStatus:
                      subscription.status,

                    newStatus:
                      "CANCELLED",

                    paymentsCount,
                    usageSessionsCount,
                    contentItemsCount,
                    contentQuotasCount,

                    preservedHistory:
                      true,
                  },

                  ipAddress,
                  userAgent,
                },
              });
            }

            return {
              success: true,
              deleted: false,
              cancelled: true,
              preservedHistory:
                true,
            };
          }

          if (
            contentQuotasCount > 0
          ) {
            await tx.subscriptionContentQuota.deleteMany({
              where: {
                subscriptionId: id,
              },
            });
          }

          const deleted =
            await tx.subscription.deleteMany(
              {
                where: {
                  id,
                },
              },
            );

          if (
            deleted.count !== 1
          ) {
            throw new ApiError(
              404,
              "Subscription not found",
            );
          }

          await tx.auditLog.create({
            data: {
              actorUserId:
                admin.userId,

              action:
                "SUBSCRIPTION_DELETE",

              entityType:
                "Subscription",

              entityId:
                id,

              metadata: {
                clientId:
                  subscription.clientId,

                serviceCategory:
                  subscription.serviceCategory,

                planName:
                  subscription.planName,

                includedMinutes:
                  subscription.includedMinutes,

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

                status:
                  subscription.status,

                paymentsCount,
                usageSessionsCount,

                preservedHistory:
                  false,
              },

              ipAddress,
              userAgent,
            },
          });

          return {
            success: true,
            deleted: true,
            cancelled: false,
            preservedHistory:
              false,
          };
        },
      );

    return NextResponse.json(
      result,
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
      "Failed to remove subscription",
    );
  }
}

