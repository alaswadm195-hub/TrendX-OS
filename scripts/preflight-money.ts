import "dotenv/config";

import { prisma } from "../src/lib/prisma";

type MoneyValue =
  | number
  | {
      toString(): string;
    };

type Issue = {
  model: string;
  id: string;
  issue: string;
  values?: Record<string, unknown>;
};

const MAX_MONEY = 100_000_000;

function moneyToNumber(
  value: MoneyValue,
): number {
  const numericValue =
    typeof value === "number"
      ? value
      : Number(value.toString());

  if (!Number.isFinite(numericValue)) {
    throw new Error(
      "Encountered a non-finite monetary value",
    );
  }

  return numericValue;
}

function toCents(
  value: MoneyValue,
): number {
  const cents =
    Math.round(
      moneyToNumber(value) * 100,
    );

  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      "Monetary value is outside the safe integer range",
    );
  }

  return cents;
}

function hasAtMostTwoDecimalPlaces(
  value: MoneyValue,
): boolean {
  const numericValue =
    moneyToNumber(value);

  return (
    Math.round(
      numericValue * 100,
    ) /
      100 ===
    numericValue
  );
}

function validateNonNegativeMoney(
  issues: Issue[],
  model: string,
  id: string,
  field: string,
  value: MoneyValue,
) {
  const numericValue =
    moneyToNumber(value);

  if (
    numericValue < 0 ||
    numericValue > MAX_MONEY ||
    !hasAtMostTwoDecimalPlaces(
      value,
    )
  ) {
    issues.push({
      model,
      id,
      issue:
        `Invalid ${field}`,
      values: {
        [field]:
          numericValue,
      },
    });
  }
}

function validatePositiveMoney(
  issues: Issue[],
  model: string,
  id: string,
  field: string,
  value: MoneyValue,
) {
  const numericValue =
    moneyToNumber(value);

  if (
    numericValue <= 0 ||
    numericValue > MAX_MONEY ||
    !hasAtMostTwoDecimalPlaces(
      value,
    )
  ) {
    issues.push({
      model,
      id,
      issue:
        `Invalid ${field}`,
      values: {
        [field]:
          numericValue,
      },
    });
  }
}

function isMissingLegacyTransactionTable(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  const message =
    "message" in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === "string"
      ? (
          error as {
            message: string;
          }
        ).message
      : "";

  if (
    message.includes('relation "Transaction" does not exist') ||
    message.includes("TableDoesNotExist")
  ) {
    return true;
  }

  if (
    "code" in error &&
    (
      error as {
        code?: unknown;
      }
    ).code === "P2010"
  ) {
    const meta =
      "meta" in error
        ? (
            error as {
              meta?: unknown;
            }
          ).meta
        : undefined;

    if (
      typeof meta === "object" &&
      meta !== null
    ) {
      const metaRecord =
        meta as Record<
          string,
          unknown
        >;

      if (
        metaRecord.code ===
        "42P01"
      ) {
        return true;
      }

      const metaText =
        JSON.stringify(
          metaRecord,
          (_key, value) =>
            typeof value ===
            "bigint"
              ? value.toString()
              : value,
        );

      if (
        metaText.includes(
          "42P01",
        ) ||
        metaText.includes(
          "TableDoesNotExist",
        ) ||
        metaText.includes(
          'relation \\"Transaction\\" does not exist',
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

async function getLegacyTransactionCount() {
  try {
    const rows =
      await prisma.$queryRaw<
        Array<{
          count:
            | bigint
            | number
            | string;
        }>
      >`
        SELECT COUNT(*) AS count
        FROM "Transaction"
      `;

    return Number(
      rows[0]?.count ?? 0,
    );
  } catch (error) {
    /*
     * After the Decimal migration the legacy Transaction table
     * is expected to be gone. Treat "table does not exist" as
     * a successful zero-row legacy state.
     */
    if (
      isMissingLegacyTransactionTable(
        error,
      )
    ) {
      return 0;
    }

    throw error;
  }
}

async function main() {
  const issues: Issue[] = [];

  const [
    employees,
    subscriptions,
    payments,
    invoices,
    invoicePayments,
    expenses,
    transactionRows,
  ] = await Promise.all([
    prisma.employee.findMany({
      select: {
        id: true,
        salary: true,
      },
    }),

    prisma.subscription.findMany({
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,

        payments: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    }),

    prisma.payment.findMany({
      select: {
        id: true,
        amount: true,
      },
    }),

    prisma.invoice.findMany({
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,

        payments: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    }),

    prisma.invoicePayment.findMany({
      select: {
        id: true,
        amount: true,
      },
    }),

    prisma.expense.findMany({
      select: {
        id: true,
        amount: true,
      },
    }),

    getLegacyTransactionCount(),
  ]);

  for (const employee of employees) {
    if (
      employee.salary !==
      null
    ) {
      validateNonNegativeMoney(
        issues,
        "Employee",
        employee.id,
        "salary",
        employee.salary,
      );
    }
  }

  for (
    const subscription of
    subscriptions
  ) {
    validateNonNegativeMoney(
      issues,
      "Subscription",
      subscription.id,
      "totalAmount",
      subscription.totalAmount,
    );

    validateNonNegativeMoney(
      issues,
      "Subscription",
      subscription.id,
      "paidAmount",
      subscription.paidAmount,
    );

    validateNonNegativeMoney(
      issues,
      "Subscription",
      subscription.id,
      "remainingAmount",
      subscription.remainingAmount,
    );

    const totalCents =
      toCents(
        subscription.totalAmount,
      );

    const paidCents =
      toCents(
        subscription.paidAmount,
      );

    const remainingCents =
      toCents(
        subscription.remainingAmount,
      );

    if (
      paidCents >
      totalCents
    ) {
      issues.push({
        model:
          "Subscription",
        id:
          subscription.id,
        issue:
          "paidAmount exceeds totalAmount",
        values: {
          totalAmount:
            moneyToNumber(
              subscription.totalAmount,
            ),
          paidAmount:
            moneyToNumber(
              subscription.paidAmount,
            ),
        },
      });
    }

    if (
      totalCents -
        paidCents !==
      remainingCents
    ) {
      issues.push({
        model:
          "Subscription",
        id:
          subscription.id,
        issue:
          "Subscription balance equation is inconsistent",
        values: {
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
        },
      });
    }

    const ledgerCents =
      subscription.payments.reduce(
        (sum, payment) =>
          sum +
          toCents(
            payment.amount,
          ),
        0,
      );

    if (
      ledgerCents !==
      paidCents
    ) {
      issues.push({
        model:
          "Subscription",
        id:
          subscription.id,
        issue:
          "Payment ledger does not match paidAmount",
        values: {
          paidAmount:
            moneyToNumber(
              subscription.paidAmount,
            ),
          ledgerTotal:
            ledgerCents /
            100,
        },
      });
    }
  }

  for (const payment of payments) {
    validatePositiveMoney(
      issues,
      "Payment",
      payment.id,
      "payment amount",
      payment.amount,
    );
  }

  for (const invoice of invoices) {
    validateNonNegativeMoney(
      issues,
      "Invoice",
      invoice.id,
      "totalAmount",
      invoice.totalAmount,
    );

    validateNonNegativeMoney(
      issues,
      "Invoice",
      invoice.id,
      "paidAmount",
      invoice.paidAmount,
    );

    validateNonNegativeMoney(
      issues,
      "Invoice",
      invoice.id,
      "remainingAmount",
      invoice.remainingAmount,
    );

    const totalCents =
      toCents(
        invoice.totalAmount,
      );

    const paidCents =
      toCents(
        invoice.paidAmount,
      );

    const remainingCents =
      toCents(
        invoice.remainingAmount,
      );

    if (
      paidCents >
      totalCents
    ) {
      issues.push({
        model:
          "Invoice",
        id:
          invoice.id,
        issue:
          "paidAmount exceeds totalAmount",
        values: {
          totalAmount:
            moneyToNumber(
              invoice.totalAmount,
            ),
          paidAmount:
            moneyToNumber(
              invoice.paidAmount,
            ),
        },
      });
    }

    if (
      totalCents -
        paidCents !==
      remainingCents
    ) {
      issues.push({
        model:
          "Invoice",
        id:
          invoice.id,
        issue:
          "Invoice balance equation is inconsistent",
        values: {
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
        },
      });
    }

    const ledgerCents =
      invoice.payments.reduce(
        (sum, payment) =>
          sum +
          toCents(
            payment.amount,
          ),
        0,
      );

    if (
      ledgerCents !==
      paidCents
    ) {
      issues.push({
        model:
          "Invoice",
        id:
          invoice.id,
        issue:
          "Invoice payment ledger does not match paidAmount",
        values: {
          paidAmount:
            moneyToNumber(
              invoice.paidAmount,
            ),
          ledgerTotal:
            ledgerCents /
            100,
        },
      });
    }
  }

  for (
    const payment of
    invoicePayments
  ) {
    validatePositiveMoney(
      issues,
      "InvoicePayment",
      payment.id,
      "payment amount",
      payment.amount,
    );
  }

  for (const expense of expenses) {
    validatePositiveMoney(
      issues,
      "Expense",
      expense.id,
      "amount",
      expense.amount,
    );
  }

  if (
    transactionRows > 0
  ) {
    issues.push({
      model:
        "Transaction",
      id:
        "(table)",
      issue:
        "Legacy Transaction table still contains rows",
      values: {
        rows:
          transactionRows,
      },
    });
  }

  console.log(
    "=== TrendX financial preflight ===",
  );

  console.log({
    employees:
      employees.length,
    subscriptions:
      subscriptions.length,
    payments:
      payments.length,
    invoices:
      invoices.length,
    invoicePayments:
      invoicePayments.length,
    expenses:
      expenses.length,
    transactionRows,
    issues:
      issues.length,
  });

  if (
    issues.length > 0
  ) {
    console.log(
      "\nFinancial data issues:",
    );

    console.dir(
      issues,
      {
        depth: null,
      },
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    "\nOK: No financial data issues found.",
  );
}

main()
  .catch((error) => {
    console.error(
      "Preflight failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
