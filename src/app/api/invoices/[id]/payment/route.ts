import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/generated/prisma/client";

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

const invoiceIdSchema =
  z.string().cuid();

const MAX_TRANSACTION_RETRIES =
  3;

const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

const paymentMethodSchema = z.enum([
  "CASH",
  "INSTAPAY",
  "BANK_TRANSFER",
  "VODAFONE_CASH",
  "OTHER",
]);

type MoneyValue =
  | number
  | {
      toString(): string;
    };

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
      "Monetary total is out of range",
    );
  }

  return cents / 100;
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

function isRetryableTransactionError(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as {
      code?: unknown;
    }).code === "P2034"
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

    const {
      id: rawId,
    } = await params;

    const parsedId =
      invoiceIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Invoice not found",
      );
    }

    const invoiceId =
      parsedId.data;

    const body =
      await parseJson(
        req,
        paymentSchema
          .extend({
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
          .strict(),
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

    let createdPayment:
      | {
          id: string;
          amount: MoneyValue;
          notes: string | null;
          paymentDate: Date;
        }
      | undefined;

    for (
      let attempt = 1;
      attempt <=
      MAX_TRANSACTION_RETRIES;
      attempt += 1
    ) {
      try {
        createdPayment =
          await prisma.$transaction(
            async (tx) => {
              const invoice =
                await tx.invoice.findUnique({
                  where: {
                    id: invoiceId,
                  },

                  select: {
                    id: true,
                    totalAmount: true,
                    paidAmount: true,
                    remainingAmount: true,
                    status: true,
                    paidAt: true,
                  },
                });

              if (!invoice) {
                throw new ApiError(
                  404,
                  "Invoice not found",
                );
              }

              if (
                invoice.status ===
                InvoiceStatus.CANCELLED
              ) {
                throw new ApiError(
                  409,
                  "Cannot add payments to a cancelled invoice",
                );
              }

              const totalCents =
                toCents(
                  invoice.totalAmount,
                );

              const paidCents =
                toCents(
                  invoice.paidAmount,
                );

              const storedRemainingCents =
                toCents(
                  invoice.remainingAmount,
                );

              if (
                totalCents < 0 ||
                paidCents < 0 ||
                storedRemainingCents <
                  0 ||
                paidCents >
                  totalCents
              ) {
                throw new ApiError(
                  409,
                  "Invalid invoice balance",
                );
              }

              const expectedRemainingCents =
                totalCents -
                paidCents;

              /*
               * The invoice aggregate fields must agree before another
               * financial mutation is allowed. This catches stale/corrupt
               * balances instead of silently compounding them.
               */
              if (
                storedRemainingCents !==
                expectedRemainingCents
              ) {
                throw new ApiError(
                  409,
                  "Invoice balance is inconsistent",
                );
              }

              if (
                invoice.status ===
                  InvoiceStatus.PAID ||
                expectedRemainingCents ===
                  0
              ) {
                throw new ApiError(
                  409,
                  "Invoice is already fully paid",
                );
              }

              if (
                paymentCents >
                expectedRemainingCents
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

              const newStatus =
                newRemainingCents ===
                0
                  ? InvoiceStatus.PAID
                  : InvoiceStatus.PARTIAL;

              const payment =
                await tx.invoicePayment.create({
                  data: {
                    invoiceId,

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

                  select: {
                    id: true,
                    amount: true,
                    notes: true,
                    paymentDate: true,
                  },
                });

              await tx.invoice.update({
                where: {
                  id: invoiceId,
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

                  status:
                    newStatus,

                  paidAt:
                    newStatus ===
                    InvoiceStatus.PAID
                      ? invoice.paidAt ||
                        new Date()
                      : null,
                },
              });

              /*
               * The payment audit row is part of the same transaction as the
               * financial writes. Notes are intentionally excluded.
               */
              await tx.auditLog.create({
                data: {
                  actorUserId:
                    admin.userId,

                  action:
                    "INVOICE_PAYMENT_CREATE",

                  entityType:
                    "InvoicePayment",

                  entityId:
                    payment.id,

                  metadata: {
                    invoiceId,

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
                        expectedRemainingCents,
                      ),

                    newRemainingAmount:
                      fromCents(
                        newRemainingCents,
                      ),

                    previousStatus:
                      invoice.status,

                    newStatus,
                  },

                  ipAddress,
                  userAgent,
                },
              });

              return payment;
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

    if (!createdPayment) {
      throw new ApiError(
        409,
        "Payment could not be completed",
      );
    }

    return NextResponse.json(
      {
        success: true,

        payment: {
          ...createdPayment,

          amount:
            moneyToNumber(
              createdPayment.amount,
            ),
        },
      },
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
      "Failed to add payment",
    );
  }
}
