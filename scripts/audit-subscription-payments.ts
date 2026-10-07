import "dotenv/config";

import { prisma } from "../src/lib/prisma";

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
    throw new Error(
      "Invalid monetary value",
    );
  }

  return numericValue;
}

function toCents(
  value: MoneyValue,
) {
  const cents =
    Math.round(
      moneyToNumber(value) * 100,
    );

  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      "Monetary value is out of range",
    );
  }

  return cents;
}

function fromCents(
  cents: number,
) {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      "Monetary value is out of range",
    );
  }

  return cents / 100;
}

async function main() {
  const subscriptions =
    await prisma.subscription.findMany({
      select: {
        id: true,
        planName: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        createdAt: true,
        startDate: true,
        endDate: true,

        client: {
          select: {
            id: true,
            name: true,
          },
        },

        payments: {
          select: {
            id: true,
            amount: true,
            notes: true,
            paymentDate: true,
            createdAt: true,
          },

          orderBy: [
            {
              paymentDate: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  console.log(
    "=== TrendX subscription payment audit ===",
  );

  for (const subscription of subscriptions) {
    const ledgerCents =
      subscription.payments.reduce(
        (sum, payment) =>
          sum +
          toCents(
            payment.amount,
          ),
        0,
      );

    console.log(
      "\n----------------------------------------",
    );

    console.log({
      subscriptionId:
        subscription.id,
      clientId:
        subscription.client.id,
      clientName:
        subscription.client.name,
      planName:
        subscription.planName,
      status:
        subscription.status,

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

      ledgerTotal:
        fromCents(
          ledgerCents,
        ),

      paymentsCount:
        subscription.payments.length,

      createdAt:
        subscription.createdAt,
      startDate:
        subscription.startDate,
      endDate:
        subscription.endDate,
    });

    console.log("Payments:");

    if (
      subscription.payments.length ===
      0
    ) {
      console.log(
        "  (no payment rows)",
      );

      continue;
    }

    for (const payment of subscription.payments) {
      console.log({
        id:
          payment.id,

        amount:
          moneyToNumber(
            payment.amount,
          ),

        notes:
          payment.notes,

        paymentDate:
          payment.paymentDate,

        createdAt:
          payment.createdAt,
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(
      "Audit failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
