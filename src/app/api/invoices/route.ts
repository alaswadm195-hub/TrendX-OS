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
  invoiceSchema,
  parseJson,
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

const invoiceCreateSchema =
  invoiceSchema.superRefine(
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

function serializeInvoice<
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
>(invoice: T) {
  return {
    ...invoice,

    totalAmount:
      moneyToNumber(
        invoice.totalAmount,
      ),

    paidAmount:
      moneyToNumber(
        invoice.paidAmount,
      ),

    remainingAmount:
      moneyToNumber(
        invoice.remainingAmount,
      ),

    ...(invoice.payments
      ? {
          payments:
            invoice.payments.map(
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

export async function GET() {
  try {
    await requireApiAdmin();

    const invoices =
      await prisma.invoice.findMany({
        include: {
          client: true,

          payments: {
            orderBy: {
              paymentDate: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const serializedInvoices =
      invoices.map(
        (invoice) =>
          serializeInvoice(
            invoice,
          ),
      );

    return NextResponse.json(
      serializedInvoices,
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
      "Failed to fetch invoices",
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
        invoiceCreateSchema,
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
        "Invalid invoice amounts",
      );
    }

    const remainingCents =
      totalCents -
      paidCents;

    let status:
      InvoiceStatus;

    if (paidCents === 0) {
      status =
        InvoiceStatus.PENDING;
    } else if (
      remainingCents === 0
    ) {
      status =
        InvoiceStatus.PAID;
    } else {
      status =
        InvoiceStatus.PARTIAL;
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

    const invoice =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Validate the referenced client inside the same transaction used
           * for invoice creation so the reference cannot disappear between
           * validation and persistence.
           */
          if (body.clientId) {
            const client =
              await tx.client.findUnique(
                {
                  where: {
                    id:
                      body.clientId,
                  },

                  select: {
                    id: true,
                  },
                },
              );

            if (!client) {
              throw new ApiError(
                400,
                "Invalid client",
              );
            }
          }

          const created =
            await tx.invoice.create(
              {
                data: {
                  clientId:
                    body.clientId ||
                    null,

                  customerName:
                    body.customerName ||
                    null,

                  customerPhone:
                    body.customerPhone ||
                    null,

                  title:
                    body.title,

                  description:
                    body.description ||
                    null,

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

                  status,

                  paidAt:
                    status ===
                    InvoiceStatus.PAID
                      ? new Date()
                      : null,
                },

                include: {
                  client: true,
                },
              },
            );

          /*
           * The invoice audit row is committed atomically with invoice
           * creation. Customer phone/name and description are intentionally
           * excluded from audit metadata.
           */
          await tx.auditLog.create({
            data: {
              actorUserId:
                admin.userId,

              action:
                "INVOICE_CREATE",

              entityType:
                "Invoice",

              entityId:
                created.id,

              metadata: {
                clientId:
                  body.clientId ||
                  null,

                title:
                  created.title,

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

                status,
              },

              ipAddress,
              userAgent,
            },
          });

          /*
           * Any opening paid amount must also exist in the durable payment
           * ledger. The invoice, payment, and both audit rows are committed
           * atomically.
           */
          if (paidCents > 0) {
            const openingPayment =
              await tx.invoicePayment.create(
                {
                  data: {
                    invoiceId:
                      created.id,

                    amount:
                      fromCents(
                        paidCents,
                      ),

                    notes:
                      "دفعة عند إنشاء الفاتورة",
                  },
                },
              );

            await tx.auditLog.create({
              data: {
                actorUserId:
                  admin.userId,

                action:
                  "INVOICE_PAYMENT_CREATE",

                entityType:
                  "InvoicePayment",

                entityId:
                  openingPayment.id,

                metadata: {
                  invoiceId:
                    created.id,

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

                  previousStatus:
                    InvoiceStatus.PENDING,

                  newStatus:
                    status,

                  source:
                    "INVOICE_OPENING_PAYMENT",
                },

                ipAddress,
                userAgent,
              },
            });
          }

          return created;
        },
      );

    return NextResponse.json(
      serializeInvoice(
        invoice,
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
      "Failed to create invoice",
    );
  }
}
