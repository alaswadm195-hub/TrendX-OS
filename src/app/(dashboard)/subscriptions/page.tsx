import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import SubscriptionsTable from "@/components/subscriptions/SubscriptionsTable";
import AddSubscriptionModal from "@/components/subscriptions/AddSubscriptionModal";
import MonthSelector from "@/components/subscriptions/MonthSelector";

import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Wallet,
  Users,
  CalendarDays,
} from "lucide-react";

type SearchParams = Promise<{
  month?: string;
}>;

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
  const numericValue =
    moneyToNumber(value);

  const cents =
    Math.round(
      numericValue * 100,
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
      "Monetary total is out of range",
    );
  }

  return cents / 100;
}

/**
 * الحصول على بداية الشهر المختار ونهاية الشهر بشكل Exclusive.
 *
 * مثال:
 * 2026-08
 *
 * start        = 2026-08-01 00:00:00
 * endExclusive = 2026-09-01 00:00:00
 */
function getMonthRange(
  month?: string,
) {
  const now = new Date();

  let year =
    now.getFullYear();

  let monthIndex =
    now.getMonth();

  if (month) {
    const match =
      /^(\d{4})-(0[1-9]|1[0-2])$/.exec(
        month,
      );

    if (match) {
      const selectedYear =
        Number(match[1]);

      const selectedMonth =
        Number(match[2]);

      if (
        Number.isInteger(
          selectedYear,
        ) &&
        selectedYear >= 2000 &&
        selectedYear <= 2100
      ) {
        year =
          selectedYear;

        monthIndex =
          selectedMonth - 1;
      }
    }
  }

  const start =
    new Date(
      year,
      monthIndex,
      1,
      0,
      0,
      0,
      0,
    );

  const endExclusive =
    new Date(
      year,
      monthIndex + 1,
      1,
      0,
      0,
      0,
      0,
    );

  const displayEnd =
    new Date(
      year,
      monthIndex + 1,
      0,
      0,
      0,
      0,
      0,
    );

  const value =
    `${year}-${String(
      monthIndex + 1,
    ).padStart(2, "0")}`;

  return {
    start,
    endExclusive,
    displayEnd,
    value,
    year,
    monthIndex,
  };
}

/**
 * اسم الشهر بالعربي
 */
function formatMonth(
  year: number,
  monthIndex: number,
) {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(
      year,
      monthIndex,
      1,
    ),
  );
}

/**
 * تنسيق التاريخ بشكل ثابت
 * لتجنب مشاكل Hydration
 */
function formatDate(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${day}/${month}/${year}`;
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const params =
    await searchParams;

  const {
    start: monthStart,
    endExclusive:
      monthEndExclusive,
    displayEnd:
      monthDisplayEnd,
    value: selectedMonth,
    year,
    monthIndex,
  } = getMonthRange(
    params.month,
  );

  /*
   * Fetch independent statistics in parallel.
   *
   * Monthly income is read directly from Payment rows that happened inside
   * the selected month. This is more accurate than deriving it only from
   * subscriptions that happen to overlap that month.
   */
  const [
    totalClients,
    rawSubscriptions,
    monthlyPayments,
  ] = await Promise.all([
    prisma.client.count(),

    prisma.subscription.findMany({
      where: {
        /*
         * Subscription overlaps the selected month:
         * start < next month AND end >= start of selected month.
         */
        startDate: {
          lt: monthEndExclusive,
        },

        endDate: {
          gte: monthStart,
        },
      },

      include: {
        client: true,

        payments: {
          where: {
            paymentDate: {
              lt: monthEndExclusive,
            },
          },

          orderBy: {
            paymentDate: "asc",
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: monthStart,
          lt: monthEndExclusive,
        },
      },

      select: {
        amount: true,
      },
    }),
  ]);

  /*
   * تجهيز الاشتراكات للشهر المختار.
   *
   * All monetary arithmetic is performed in integer cents. This works with
   * the current Float schema and remains safe after Prisma starts returning
   * Decimal values.
   */
  const subscriptions =
    rawSubscriptions.map(
      (sub) => {
        const totalCents =
          toCents(
            sub.totalAmount,
          );

        const paidUntilMonthEndCents =
          sub.payments.reduce(
            (
              sum,
              payment,
            ) =>
              sum +
              toCents(
                payment.amount,
              ),
            0,
          );

        const remainingUntilMonthEndCents =
          Math.max(
            0,
            totalCents -
              paidUntilMonthEndCents,
          );

        /*
         * Preserve CANCELLED explicitly instead of reclassifying a cancelled
         * subscription as ACTIVE solely because its endDate is in the future.
         */
        const status =
          sub.status ===
          "CANCELLED"
            ? "CANCELLED"
            : sub.endDate <
                monthEndExclusive
              ? "EXPIRED"
              : "ACTIVE";

        return {
          ...sub,

          totalAmount:
            fromCents(
              totalCents,
            ),

          paidAmount:
            fromCents(
              paidUntilMonthEndCents,
            ),

          remainingAmount:
            fromCents(
              remainingUntilMonthEndCents,
            ),

          payments:
            sub.payments.map(
              (payment) => ({
                ...payment,

                amount:
                  moneyToNumber(
                    payment.amount,
                  ),
              }),
            ),

          status,
        };
      },
    );

  const activeSubscriptions =
    subscriptions.filter(
      (sub) =>
        sub.status ===
        "ACTIVE",
    );

  const expiredSubscriptions =
    subscriptions.filter(
      (sub) =>
        sub.status ===
        "EXPIRED",
    );

  /*
   * إجمالي المدفوعات التي تمت داخل الشهر المختار فقط.
   */
  const totalMonthlyIncomeCents =
    monthlyPayments.reduce(
      (sum, payment) =>
        sum +
        toCents(
          payment.amount,
        ),
      0,
    );

  const totalMonthlyIncome =
    fromCents(
      totalMonthlyIncomeCents,
    );

  /*
   * إجمالي المتبقي بالنسبة لنهاية الشهر المختار.
   */
  const totalRemainingCents =
    subscriptions.reduce(
      (sum, sub) =>
        sum +
        toCents(
          sub.remainingAmount,
        ),
      0,
    );

  const totalRemaining =
    fromCents(
      totalRemainingCents,
    );

  const monthLabel =
    formatMonth(
      year,
      monthIndex,
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            الاشتراكات
          </h1>

          <p className="text-slate-500 mt-1 text-sm md:text-base">
            إدارة ومتابعة اشتراكات العملاء
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <MonthSelector
              value={
                selectedMonth
              }
            />
          </div>

          <AddSubscriptionModal />
        </div>
      </div>

      {/* الشهر المحدد */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays
            size={20}
            className="text-blue-600"
          />

          <div>
            <p className="text-sm text-slate-500">
              الشهر المحدد
            </p>

            <p className="font-bold text-blue-700">
              {monthLabel}
            </p>
          </div>

          <div className="text-sm text-slate-500 mr-auto">
            من{" "}
            {formatDate(
              monthStart,
            )}{" "}
            إلى{" "}
            {formatDate(
              monthDisplayEnd,
            )}
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {/* إجمالي العملاء */}
        <div className="bg-white rounded-2xl border p-4 md:p-5 shadow-sm">
          <div className="flex justify-between items-center gap-3">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                إجمالي العملاء
              </p>

              <h3 className="text-2xl md:text-3xl font-bold mt-2">
                {totalClients}
              </h3>
            </div>

            <Users
              size={24}
              className="text-purple-600"
            />
          </div>
        </div>

        {/* الاشتراكات النشطة */}
        <div className="bg-white rounded-2xl border p-4 md:p-5 shadow-sm">
          <div className="flex justify-between items-center gap-3">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                الاشتراكات النشطة
              </p>

              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-green-600">
                {
                  activeSubscriptions.length
                }
              </h3>
            </div>

            <CheckCircle
              size={24}
              className="text-green-600"
            />
          </div>
        </div>

        {/* المنتهية */}
        <div className="bg-white rounded-2xl border p-4 md:p-5 shadow-sm">
          <div className="flex justify-between items-center gap-3">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                المنتهية
              </p>

              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-red-600">
                {
                  expiredSubscriptions.length
                }
              </h3>
            </div>

            <AlertTriangle
              size={24}
              className="text-red-600"
            />
          </div>
        </div>

        {/* دخل الشهر */}
        <div className="bg-white rounded-2xl border p-4 md:p-5 shadow-sm">
          <div className="flex justify-between items-center gap-3">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                دخل الشهر
              </p>

              <h3 className="text-xl md:text-3xl font-bold mt-2 text-blue-600">
                {totalMonthlyIncome.toLocaleString(
                  "ar-EG",
                )}{" "}
                ج
              </h3>
            </div>

            <CreditCard
              size={24}
              className="text-blue-600"
            />
          </div>
        </div>

        {/* المتبقي */}
        <div className="bg-white rounded-2xl border p-4 md:p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center gap-3">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                المتبقي
              </p>

              <h3 className="text-xl md:text-3xl font-bold mt-2 text-orange-500">
                {totalRemaining.toLocaleString(
                  "ar-EG",
                )}{" "}
                ج
              </h3>
            </div>

            <Wallet
              size={24}
              className="text-orange-500"
            />
          </div>
        </div>
      </div>

      {/* جدول الاشتراكات */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <SubscriptionsTable
          subscriptions={
            subscriptions
          }
        />
      </div>
    </div>
  );
}
