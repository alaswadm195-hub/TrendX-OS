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
  expenseSchema,
  parseJson,
} from "@/lib/validation";

type MoneyValue =
  | number
  | {
      toString(): string;
    };

const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

const paymentMethodSchema = z.enum([
  "CASH",
  "INSTAPAY",
  "BANK_TRANSFER",
  "VODAFONE_CASH",
  "OTHER",
]);

const expenseCategorySchema = z.enum([
  "SALARIES",
  "RENT",
  "ADS",
  "EQUIPMENT",
  "TRANSPORT",
  "PURCHASES",
  "OTHER",
]);

function hasAtMostTwoDecimalPlaces(
  value: number,
) {
  return (
    Math.round(value * 100) /
      100 ===
    value
  );
}

const expenseCreateSchema =
  expenseSchema
    .extend({
      category:
        expenseCategorySchema.default(
          "OTHER",
        ),

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

function serializeExpense<
  T extends {
    amount: MoneyValue;
  } & Record<string, unknown>,
>(expense: T) {
  return {
    ...expense,
    amount:
      moneyToNumber(
        expense.amount,
      ),
  };
}

export async function GET() {
  try {
    await requireApiAdmin();

    const expenses =
      await prisma.expense.findMany({
        orderBy: {
          expenseDate: "desc",
        },
      });

    const serializedExpenses =
      expenses.map(
        (expense) =>
          serializeExpense(
            expense,
          ),
      );

    return NextResponse.json(
      serializedExpenses,
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
      "Failed to fetch expenses",
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
        expenseCreateSchema,
      );

    const amountCents =
      toCents(
        body.amount,
      );

    if (amountCents <= 0) {
      throw new ApiError(
        400,
        "Expense amount must be greater than zero",
      );
    }

    const expenseDate =
      body.expenseDate
        ? new Date(
            body.expenseDate,
          )
        : new Date();

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
     * Expense creation and its audit record are committed atomically.
     * If either write fails, neither one is persisted.
     */
    const expense =
      await prisma.$transaction(
        async (tx) => {
          const createdExpense =
            await tx.expense.create({
              data: {
                title:
                  body.title,

                amount:
                  fromCents(
                    amountCents,
                  ),

                category:
                  body.category,

                paymentMethod:
                  body.paymentMethod,

                referenceNumber:
                  body.referenceNumber ||
                  null,

                notes:
                  body.notes ||
                  null,

                expenseDate,
              },
            });

          await tx.auditLog.create({
            data: {
              actorUserId:
                admin.userId,

              action:
                "EXPENSE_CREATE",

              entityType:
                "Expense",

              entityId:
                createdExpense.id,

              metadata: {
                title:
                  createdExpense.title,

                amount:
                  fromCents(
                    amountCents,
                  ),

                category:
                  body.category,

                paymentMethod:
                  body.paymentMethod,

                referenceNumber:
                  body.referenceNumber ||
                  null,

                expenseDate:
                  createdExpense.expenseDate.toISOString(),
              },

              ipAddress,
              userAgent,
            },
          });

          return createdExpense;
        },
      );

    return NextResponse.json(
      serializeExpense(
        expense,
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
      "Failed to create expense",
    );
  }
}
