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

/**
 * الحصول على بداية ونهاية الشهر المختار
 *
 * القيمة تكون بالشكل:
 * 2026-08
 */
function getMonthRange(month?: string) {
  const now = new Date();

  let year = now.getFullYear();
  let monthIndex = now.getMonth();

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [selectedYear, selectedMonth] = month
      .split("-")
      .map(Number);

    if (
      selectedYear >= 2000 &&
      selectedYear <= 2100 &&
      selectedMonth >= 1 &&
      selectedMonth <= 12
    ) {
      year = selectedYear;
      monthIndex = selectedMonth - 1;
    }
  }

  const start = new Date(
    year,
    monthIndex,
    1,
    0,
    0,
    0,
    0
  );

  const end = new Date(
    year,
    monthIndex + 1,
    0,
    23,
    59,
    59,
    999
  );

  const value = `${year}-${String(
    monthIndex + 1
  ).padStart(2, "0")}`;

  return {
    start,
    end,
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
  monthIndex: number
) {
  return new Intl.DateTimeFormat("ar-EG", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(
      year,
      monthIndex,
      1
    )
  );
}

/**
 * تنسيق التاريخ بشكل ثابت
 * لتجنب مشاكل Hydration
 */
function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${day}/${month}/${year}`;
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const {
    start: monthStart,
    end: monthEnd,
    value: selectedMonth,
    year,
    monthIndex,
  } = getMonthRange(params.month);

  /*
   * إجمالي العملاء الموجودين في النظام
   */
  const totalClients =
    await prisma.client.count();

  /*
   * الاشتراكات التي تتقاطع مع الشهر المختار.
   *
   * مثال:
   *
   * اشتراك يبدأ 1/8 وينتهي 31/8
   * → يظهر في أغسطس
   *
   * اشتراك يبدأ 15/7 وينتهي 15/8
   * → يظهر في أغسطس
   *
   * اشتراك انتهى 31/7
   * → لا يظهر في أغسطس
   */
  const rawSubscriptions =
    await prisma.subscription.findMany({
      where: {
        startDate: {
          lte: monthEnd,
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
              lte: monthEnd,
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
    });

  /*
   * تجهيز الاشتراكات للشهر المختار
   */
  const subscriptions =
    rawSubscriptions.map((sub) => {
      /*
       * كل المدفوعات حتى نهاية الشهر المختار
       */
      const paidUntilMonthEnd =
        sub.payments.reduce(
          (sum, payment) =>
            sum + payment.amount,
          0
        );

      /*
       * المتبقي حتى نهاية الشهر المختار
       */
      const remainingUntilMonthEnd =
        Math.max(
          0,
          sub.totalAmount -
            paidUntilMonthEnd
        );

      /*
       * حالة الاشتراك بالنسبة للشهر المختار
       */
      const status =
        new Date(sub.endDate) <
        monthEnd
          ? "EXPIRED"
          : "ACTIVE";

      return {
        ...sub,

        paidAmount:
          paidUntilMonthEnd,

        remainingAmount:
          remainingUntilMonthEnd,

        status,
      };
    });

  /*
   * الاشتراكات النشطة
   */
  const activeSubscriptions =
    subscriptions.filter(
      (sub) =>
        sub.status ===
        "ACTIVE"
    );

  /*
   * الاشتراكات المنتهية
   */
  const expiredSubscriptions =
    subscriptions.filter(
      (sub) =>
        sub.status ===
        "EXPIRED"
    );

  /*
   * إجمالي المدفوعات التي تمت داخل الشهر المختار فقط
   */
  const totalMonthlyIncome =
    rawSubscriptions.reduce(
      (subscriptionTotal, sub) => {
        const monthlyPayments =
          sub.payments
            .filter((payment) => {
              const paymentDate =
                new Date(
                  payment.paymentDate
                );

              return (
                paymentDate >=
                  monthStart &&
                paymentDate <=
                  monthEnd
              );
            })
            .reduce(
              (sum, payment) =>
                sum + payment.amount,
              0
            );

        return (
          subscriptionTotal +
          monthlyPayments
        );
      },
      0
    );

  /*
   * إجمالي المتبقي
   */
  const totalRemaining =
    subscriptions.reduce(
      (sum, sub) =>
        sum +
        sub.remainingAmount,
      0
    );

  /*
   * اسم الشهر بالعربي
   */
  const monthLabel =
    formatMonth(
      year,
      monthIndex
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
    <MonthSelector value={selectedMonth} />
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
              monthStart
            )}{" "}
            إلى{" "}
            {formatDate(
              monthEnd
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
                  "ar-EG"
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
                  "ar-EG"
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