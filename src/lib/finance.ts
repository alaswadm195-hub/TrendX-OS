import { prisma } from "@/lib/prisma";

type MoneyValue =
  | number
  | string
  | {
      toString(): string;
    }
  | null
  | undefined;

export const paymentMethodLabels = {
  CASH: "كاش",
  INSTAPAY: "InstaPay",
  BANK_TRANSFER: "تحويل بنكي",
  VODAFONE_CASH: "Vodafone Cash",
  OTHER: "أخرى",
} as const;

export const expenseCategoryLabels = {
  SALARIES: "رواتب",
  RENT: "إيجار",
  ADS: "إعلانات",
  EQUIPMENT: "معدات",
  TRANSPORT: "مواصلات",
  PURCHASES: "مشتريات",
  OTHER: "أخرى",
} as const;

export function moneyToCents(
  value: MoneyValue,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const numericValue =
    typeof value === "object"
      ? Number(value.toString())
      : Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    throw new Error(
      "Invalid monetary value",
    );
  }

  const cents =
    Math.round(
      numericValue * 100,
    );

  if (
    !Number.isSafeInteger(cents)
  ) {
    throw new Error(
      "Monetary value is out of range",
    );
  }

  return cents;
}

export function centsToNumber(
  cents: number,
) {
  if (
    !Number.isSafeInteger(cents)
  ) {
    throw new Error(
      "Monetary value is out of range",
    );
  }

  return cents / 100;
}

export function formatMoney(
  cents: number,
) {
  return `${centsToNumber(
    cents,
  ).toLocaleString("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ج`;
}

type DateRange = {
  from?: Date;
  to?: Date;
};

function dateWhere(
  field: "createdAt" | "paymentDate" | "expenseDate",
  range?: DateRange,
) {
  if (
    !range?.from &&
    !range?.to
  ) {
    return {};
  }

  return {
    [field]: {
      ...(range.from
        ? {
            gte:
              range.from,
          }
        : {}),
      ...(range.to
        ? {
            lt:
              range.to,
          }
        : {}),
    },
  };
}

export async function getFinanceSnapshot(
  range?: DateRange,
) {
  const [
    invoiceSales,
    subscriptionSales,
    invoiceReceivables,
    subscriptionReceivables,
    invoiceCollections,
    subscriptionCollections,
    expensesTotal,
    invoiceCount,
    openInvoiceCount,
    subscriptionCount,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        status: {
          not: "CANCELLED",
        },
        ...dateWhere(
          "createdAt",
          range,
        ),
      },
      _sum: {
        totalAmount: true,
      },
    }),

    prisma.subscription.aggregate(
      {
        where: {
          status: {
            not: "CANCELLED",
          },
          ...dateWhere(
            "createdAt",
            range,
          ),
        },
        _sum: {
          totalAmount: true,
        },
      },
    ),

    prisma.invoice.aggregate({
      where: {
        status: {
          not: "CANCELLED",
        },
      },
      _sum: {
        remainingAmount:
          true,
      },
    }),

    prisma.subscription.aggregate(
      {
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        _sum: {
          remainingAmount:
            true,
        },
      },
    ),

    prisma.invoicePayment.aggregate(
      {
        where: {
          ...dateWhere(
            "paymentDate",
            range,
          ),
        },
        _sum: {
          amount: true,
        },
      },
    ),

    prisma.payment.aggregate({
      where: {
        ...dateWhere(
          "paymentDate",
          range,
        ),
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.expense.aggregate({
      where: {
        ...dateWhere(
          "expenseDate",
          range,
        ),
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.invoice.count({
      where: {
        status: {
          not: "CANCELLED",
        },
        ...dateWhere(
          "createdAt",
          range,
        ),
      },
    }),

    prisma.invoice.count({
      where: {
        status: {
          in: [
            "PENDING",
            "PARTIAL",
          ],
        },
      },
    }),

    prisma.subscription.count({
      where: {
        status: {
          not: "CANCELLED",
        },
        ...dateWhere(
          "createdAt",
          range,
        ),
      },
    }),
  ]);

  const invoiceSalesCents =
    moneyToCents(
      invoiceSales._sum
        .totalAmount,
    );

  const subscriptionSalesCents =
    moneyToCents(
      subscriptionSales._sum
        .totalAmount,
    );

  const invoiceCollectionsCents =
    moneyToCents(
      invoiceCollections._sum
        .amount,
    );

  const subscriptionCollectionsCents =
    moneyToCents(
      subscriptionCollections
        ._sum.amount,
    );

  const expensesCents =
    moneyToCents(
      expensesTotal._sum.amount,
    );

  const receivablesCents =
    moneyToCents(
      invoiceReceivables._sum
        .remainingAmount,
    ) +
    moneyToCents(
      subscriptionReceivables
        ._sum.remainingAmount,
    );

  const salesCents =
    invoiceSalesCents +
    subscriptionSalesCents;

  const collectionsCents =
    invoiceCollectionsCents +
    subscriptionCollectionsCents;

  return {
    salesCents,
    invoiceSalesCents,
    subscriptionSalesCents,
    collectionsCents,
    invoiceCollectionsCents,
    subscriptionCollectionsCents,
    receivablesCents,
    expensesCents,
    cashBalanceCents:
      collectionsCents -
      expensesCents,
    netCashFlowCents:
      collectionsCents -
      expensesCents,
    invoiceCount,
    openInvoiceCount,
    subscriptionCount,
  };
}

export type TreasuryMovement = {
  id: string;
  kind:
    | "INVOICE_PAYMENT"
    | "SUBSCRIPTION_PAYMENT"
    | "EXPENSE";
  title: string;
  party: string;
  amountCents: number;
  direction:
    | "IN"
    | "OUT";
  date: Date;
  paymentMethod:
    | "CASH"
    | "INSTAPAY"
    | "BANK_TRANSFER"
    | "VODAFONE_CASH"
    | "OTHER";
  referenceNumber:
    | string
    | null;
};

export async function getRecentTreasuryMovements(
  limit = 20,
) {
  const fetchCount =
    Math.max(limit, 20);

  const [
    invoicePayments,
    subscriptionPayments,
    expenses,
  ] = await Promise.all([
    prisma.invoicePayment.findMany(
      {
        take: fetchCount,
        orderBy: {
          paymentDate:
            "desc",
        },
        select: {
          id: true,
          amount: true,
          paymentDate:
            true,
          paymentMethod:
            true,
          referenceNumber:
            true,
          invoice: {
            select: {
              title: true,
              customerName:
                true,
              client: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    ),

    prisma.payment.findMany({
      take: fetchCount,
      orderBy: {
        paymentDate:
          "desc",
      },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        referenceNumber: true,
        subscription: {
          select: {
            planName: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    prisma.expense.findMany({
      take: fetchCount,
      orderBy: {
        expenseDate:
          "desc",
      },
      select: {
        id: true,
        title: true,
        amount: true,
        expenseDate: true,
        paymentMethod: true,
        referenceNumber: true,
      },
    }),
  ]);

  const movements:
    TreasuryMovement[] = [
      ...invoicePayments.map(
        (payment) => ({
          id: `invoice-${payment.id}`,
          kind:
            "INVOICE_PAYMENT" as const,
          title:
            payment.invoice
              .title,
          party:
            payment.invoice
              .client?.name ||
            payment.invoice
              .customerName ||
            "عميل",
          amountCents:
            moneyToCents(
              payment.amount,
            ),
          direction:
            "IN" as const,
          date:
            payment.paymentDate,
          paymentMethod:
            payment.paymentMethod,
          referenceNumber:
            payment.referenceNumber,
        }),
      ),

      ...subscriptionPayments.map(
        (payment) => ({
          id: `subscription-${payment.id}`,
          kind:
            "SUBSCRIPTION_PAYMENT" as const,
          title:
            payment
              .subscription
              .planName,
          party:
            payment
              .subscription
              .client.name,
          amountCents:
            moneyToCents(
              payment.amount,
            ),
          direction:
            "IN" as const,
          date:
            payment.paymentDate,
          paymentMethod:
            payment.paymentMethod,
          referenceNumber:
            payment.referenceNumber,
        }),
      ),

      ...expenses.map(
        (expense) => ({
          id: `expense-${expense.id}`,
          kind:
            "EXPENSE" as const,
          title:
            expense.title,
          party: "مصروف",
          amountCents:
            moneyToCents(
              expense.amount,
            ),
          direction:
            "OUT" as const,
          date:
            expense.expenseDate,
          paymentMethod:
            expense.paymentMethod,
          referenceNumber:
            expense.referenceNumber,
        }),
      ),
    ];

  return movements
    .sort(
      (a, b) =>
        b.date.getTime() -
        a.date.getTime(),
    )
    .slice(0, limit);
}

export async function getPaymentMethodBreakdown(
  range?: DateRange,
) {
  type PaymentMethodKey =
    keyof typeof paymentMethodLabels;

  const [
    invoiceGroups,
    subscriptionGroups,
  ] = await Promise.all([
    prisma.invoicePayment.groupBy({
      by: ["paymentMethod"],
      where: {
        ...dateWhere(
          "paymentDate",
          range,
        ),
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.groupBy({
      by: ["paymentMethod"],
      where: {
        ...dateWhere(
          "paymentDate",
          range,
        ),
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const totals =
    new Map<
      PaymentMethodKey,
      number
    >();

  for (const method of Object.keys(
    paymentMethodLabels,
  ) as PaymentMethodKey[]) {
    totals.set(method, 0);
  }

  for (const group of invoiceGroups) {
    const paymentMethod =
      group.paymentMethod as PaymentMethodKey;

    totals.set(
      paymentMethod,
      (totals.get(
        paymentMethod,
      ) ?? 0) +
        moneyToCents(
          group._sum.amount,
        ),
    );
  }

  for (const group of subscriptionGroups) {
    const paymentMethod =
      group.paymentMethod as PaymentMethodKey;

    totals.set(
      paymentMethod,
      (totals.get(
        paymentMethod,
      ) ?? 0) +
        moneyToCents(
          group._sum.amount,
        ),
    );
  }

  return Array.from(
    totals.entries(),
  )
    .map(
      ([
        paymentMethod,
        amountCents,
      ]) => ({
        paymentMethod,
        label:
          paymentMethodLabels[
            paymentMethod
          ],
        amountCents,
      }),
    )
    .filter(
      (item) =>
        item.amountCents > 0,
    )
    .sort(
      (a, b) =>
        b.amountCents -
        a.amountCents,
    );
}
