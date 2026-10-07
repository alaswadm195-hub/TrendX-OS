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
  paymentSchema,
} from "@/lib/validation";

type MoneyValue =
  | number
  | {
      toString(): string;
    };

const MAX_TRANSACTION_RETRIES = 3;
const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

const paymentMethodSchema = z.enum([
  "CASH",
  "INSTAPAY",
  "BANK_TRANSFER",
  "VODAFONE_CASH",
  "OTHER",
]);

function moneyToNumber(
  value: MoneyValue,
) {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value.toString());

  if (!Number.isFinite(numberValue)) {
    throw new ApiError(
      409,
      "Invalid monetary value",
    );
  }

  return numberValue;
}

function toCents(
  value: MoneyValue,
) {
  const numberValue =
    moneyToNumber(value);

  const cents =
    Math.round(
      numberValue * 100,
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

function hasAtMostTwoDecimalPlaces(
  value: number,
) {
  return (
    Math.round(value * 100) /
      100 ===
    value
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

const subscriptionPaymentSchema =
  paymentSchema
    .extend({
      subscriptionId:
        z.string().cuid(),

      paymentMethod:
        paymentMethodSchema.default(
          "OTHER",
        ),

      referenceNumber:
        z
          .string()
          .trim()
          .max(160)
          .optional()
          .nullable(),
    })
    .strict()
    .superRefine(
      (value, ctx) => {
        if (
          !hasAtMostTwoDecimalPlaces(
            value.amount,
          )
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: ["amount"],
            message:
              "Amount must have at most 2 decimal places",
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

function serializePayment<
  T extends {
    amount: MoneyValue;
  },
>(payment: T) {
  return {
    ...payment,
    amount:
      moneyToNumber(
        payment.amount,
      ),
  };
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
        subscriptionPaymentSchema,
      );

    const paymentCents =
      toCents(
        body.amount,
      );

    if (paymentCents <= 0) {
      throw new ApiError(
        400,
        "Payment amount must be greater than zero",
      );
    }

    /*
     * Request context is captured before entering the transaction.
     * Only bounded, non-secret metadata is persisted in AuditLog.
     */
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

    let payment:
      | Awaited<
          ReturnType<
            typeof prisma.payment.create
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
        payment =
          await prisma.$transaction(
            async (tx) => {
              const subscription =
                await tx.subscription.findUnique(
                  {
                    where: {
                      id:
                        body.subscriptionId,
                    },

                    select: {
                      id: true,
                      totalAmount: true,
                      paidAmount: true,
                      remainingAmount: true,
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

              if (
                subscription.status ===
                "CANCELLED"
              ) {
                throw new ApiError(
                  409,
                  "Cannot add payments to a cancelled subscription",
                );
              }

              const totalCents =
                toCents(
                  subscription.totalAmount,
                );

              const paidCents =
                toCents(
                  subscription.paidAmount,
                );

              const storedRemainingCents =
                toCents(
                  subscription.remainingAmount,
                );

              if (
                totalCents < 0 ||
                paidCents < 0 ||
                paidCents > totalCents
              ) {
                throw new ApiError(
                  409,
                  "Invalid subscription balance",
                );
              }

              const calculatedRemainingCents =
                totalCents -
                paidCents;

              if (
                storedRemainingCents !==
                calculatedRemainingCents
              ) {
                throw new ApiError(
                  409,
                  "Subscription balance is inconsistent",
                );
              }

              const paymentLedger =
                await tx.payment.aggregate({
                  where: {
                    subscriptionId:
                      body.subscriptionId,
                  },

                  _sum: {
                    amount: true,
                  },
                });

              const ledgerPaidCents =
                toCents(
                  paymentLedger._sum.amount ??
                    0,
                );

              if (
                ledgerPaidCents !==
                paidCents
              ) {
                throw new ApiError(
                  409,
                  "Payment ledger is inconsistent with subscription balance",
                );
              }

              if (
                paymentCents >
                calculatedRemainingCents
              ) {
                throw new ApiError(
                  409,
                  "Payment exceeds remaining amount",
                );
              }

              const newPaidCents =
                paidCents +
                paymentCents;

              const newRemainingCents =
                totalCents -
                newPaidCents;

              if (
                newPaidCents < 0 ||
                newRemainingCents < 0
              ) {
                throw new ApiError(
                  409,
                  "Invalid subscription balance",
                );
              }

              const createdPayment =
                await tx.payment.create({
                  data: {
                    subscriptionId:
                      body.subscriptionId,

                    amount:
                      fromCents(
                        paymentCents,
                      ),

                    paymentMethod:
                      body.paymentMethod,

                    referenceNumber:
                      body.referenceNumber ||
                      null,

                    notes:
                      body.notes ||
                      null,
                  },
                });

              await tx.subscription.update(
                {
                  where: {
                    id:
                      body.subscriptionId,
                  },

                  data: {
                    paidAmount:
                      fromCents(
                        newPaidCents,
                      ),

                    remainingAmount:
                      fromCents(
                        newRemainingCents,
                      ),
                  },
                },
              );

              /*
               * AuditLog is part of the same database transaction.
               * Either the payment, balance update, and audit record all
               * commit together, or none of them do.
               */
              await tx.auditLog.create({
                data: {
                  actorUserId:
                    admin.userId,

                  action:
                    "PAYMENT_CREATE",

                  entityType:
                    "Payment",

                  entityId:
                    createdPayment.id,

                  metadata: {
                    subscriptionId:
                      body.subscriptionId,

                    amount:
                      fromCents(
                        paymentCents,
                      ),

                    paymentMethod:
                      body.paymentMethod,

                    referenceNumber:
                      body.referenceNumber ||
                      null,

                    previousPaidAmount:
                      fromCents(
                        paidCents,
                      ),

                    newPaidAmount:
                      fromCents(
                        newPaidCents,
                      ),

                    previousRemainingAmount:
                      fromCents(
                        calculatedRemainingCents,
                      ),

                    newRemainingAmount:
                      fromCents(
                        newRemainingCents,
                      ),
                  },

                  ipAddress,
                  userAgent,
                },
              });

              return createdPayment;
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

    if (!payment) {
      throw new ApiError(
        409,
        "Payment could not be completed",
      );
    }

    return NextResponse.json(
      serializePayment(
        payment,
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
      "Failed to create payment",
    );
  }
}

export async function GET() {
  try {
    await requireApiAdmin();

    const payments =
      await prisma.payment.findMany({
        include: {
          subscription: {
            include: {
              client: true,
            },
          },
        },

        orderBy: {
          paymentDate:
            "desc",
        },
      });

    const serializedPayments =
      payments.map(
        (payment) => ({
          ...payment,

          amount:
            moneyToNumber(
              payment.amount,
            ),

          subscription: {
            ...payment.subscription,

            totalAmount:
              moneyToNumber(
                payment.subscription
                  .totalAmount,
              ),

            paidAmount:
              moneyToNumber(
                payment.subscription
                  .paidAmount,
              ),

            remainingAmount:
              moneyToNumber(
                payment.subscription
                  .remainingAmount,
              ),
          },
        }),
      );

    return NextResponse.json(
      serializedPayments,
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
      "Failed to fetch payments",
    );
  }
}
