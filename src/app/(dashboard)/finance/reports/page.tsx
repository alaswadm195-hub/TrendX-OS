import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import {
  formatMoney,
  getFinanceSnapshot,
  getPaymentMethodBreakdown,
} from "@/lib/finance";

type ReportsPageProps = {
  searchParams: Promise<{
    period?: string;
    month?: string;
  }>;
};

const TIME_ZONE = "Africa/Cairo";

function zonedParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function timezoneOffset(date: Date) {
  const parts = zonedParts(date);

  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) - date.getTime()
  );
}

function cairoToUtc(
  year: number,
  monthIndex: number,
  day: number,
) {
  const guess = new Date(
    Date.UTC(year, monthIndex, day, 0, 0, 0),
  );

  const first = new Date(
    guess.getTime() - timezoneOffset(guess),
  );

  return new Date(
    guess.getTime() - timezoneOffset(first),
  );
}

function currentMonthValue() {
  const parts = zonedParts(new Date());

  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function parseMonthValue(value?: string) {
  const fallback = currentMonthValue();
  const target = value ?? fallback;

  const match = /^(\d{4})-(\d{2})$/.exec(target);

  if (!match) {
    return parseMonthValue(fallback);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return parseMonthValue(fallback);
  }

  return {
    value: `${year}-${String(month).padStart(2, "0")}`,
    year,
    month,
  };
}

function shiftMonth(
  year: number,
  month: number,
  delta: number,
) {
  const date = new Date(
    Date.UTC(year, month - 1 + delta, 1),
  );

  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = date.getUTCMonth() + 1;

  return `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}`;
}

function monthLabel(
  year: number,
  month: number,
) {
  const date = cairoToUtc(
    year,
    month - 1,
    15,
  );

  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function periodRange(
  period: string,
  selectedMonth: {
    year: number;
    month: number;
  },
) {
  if (period === "all") {
    return undefined;
  }

  const now = new Date();
  const parts = zonedParts(now);

  if (period === "today") {
    return {
      from: cairoToUtc(
        parts.year,
        parts.month - 1,
        parts.day,
      ),
      to: cairoToUtc(
        parts.year,
        parts.month - 1,
        parts.day + 1,
      ),
    };
  }

  if (period === "week") {
    const localNoon = new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        12,
      ),
    );

    const dayOfWeek = localNoon.getUTCDay();
    const daysFromSaturday = (dayOfWeek + 1) % 7;

    return {
      from: cairoToUtc(
        parts.year,
        parts.month - 1,
        parts.day - daysFromSaturday,
      ),
      to: cairoToUtc(
        parts.year,
        parts.month - 1,
        parts.day + 1,
      ),
    };
  }

  return {
    from: cairoToUtc(
      selectedMonth.year,
      selectedMonth.month - 1,
      1,
    ),
    to: cairoToUtc(
      selectedMonth.year,
      selectedMonth.month,
      1,
    ),
  };
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/tasks");
  }

  const params = await searchParams;

  const period =
    params.period === "today" ||
    params.period === "week" ||
    params.period === "all"
      ? params.period
      : "month";

  const selectedMonth = parseMonthValue(
    params.month,
  );

  const range = periodRange(
    period,
    selectedMonth,
  );

  const [snapshot, paymentMethods] =
    await Promise.all([
      getFinanceSnapshot(range),
      getPaymentMethodBreakdown(range),
    ]);

  const previousMonth = shiftMonth(
    selectedMonth.year,
    selectedMonth.month,
    -1,
  );

  const nextMonth = shiftMonth(
    selectedMonth.year,
    selectedMonth.month,
    1,
  );

  const periodLabel =
    period === "today"
      ? "اليوم"
      : period === "week"
        ? "هذا الأسبوع"
        : period === "all"
          ? "كل الفترة"
          : monthLabel(
              selectedMonth.year,
              selectedMonth.month,
            );

  return (
    <div
      dir="rtl"
      className="p-4 md:p-6 lg:p-8"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#f28a32]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-black text-[#102f55]">
            الجرد والتقارير
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-500">
            أرقام الفترة مبنية على المبيعات والتحصيلات الفعلية والمصروفات
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/finance/reports?period=today"
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              period === "today"
                ? "bg-[#123b69] text-white"
                : "border border-[#e1e7ef] bg-white text-[#17385f]"
            }`}
          >
            اليوم
          </Link>

          <Link
            href="/finance/reports?period=week"
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              period === "week"
                ? "bg-[#123b69] text-white"
                : "border border-[#e1e7ef] bg-white text-[#17385f]"
            }`}
          >
            الأسبوع
          </Link>

          <Link
            href={`/finance/reports?period=month&month=${selectedMonth.value}`}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              period === "month"
                ? "bg-[#123b69] text-white"
                : "border border-[#e1e7ef] bg-white text-[#17385f]"
            }`}
          >
            الشهر
          </Link>

          <Link
            href="/finance/reports?period=all"
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              period === "all"
                ? "bg-[#123b69] text-white"
                : "border border-[#e1e7ef] bg-white text-[#17385f]"
            }`}
          >
            الكل
          </Link>
        </div>
      </div>

      {/* Month navigation */}
      <div className="mb-5 rounded-2xl border border-[#e5ebf2] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">
              اختيار شهر للتقرير
            </p>

            <p className="mt-1 text-lg font-black text-[#102f55]">
              {monthLabel(
                selectedMonth.year,
                selectedMonth.month,
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Link
              href={`/finance/reports?period=month&month=${previousMonth}`}
              className="rounded-xl border border-[#e1e7ef] bg-white px-4 py-2.5 text-sm font-bold text-[#17385f] transition hover:bg-slate-50"
            >
              الشهر السابق
            </Link>

            <form
              method="GET"
              action="/finance/reports"
              className="flex flex-wrap items-end gap-2"
            >
              <input
                type="hidden"
                name="period"
                value="month"
              />

              <label className="space-y-1">
                <span className="block text-xs font-bold text-slate-500">
                  الشهر
                </span>

                <input
                  type="month"
                  name="month"
                  defaultValue={
                    selectedMonth.value
                  }
                  className="rounded-xl border border-[#dfe6ef] bg-white px-3 py-2.5 text-sm font-bold text-[#17385f] outline-none focus:border-[#f28a32]"
                />
              </label>

              <button
                type="submit"
                className="rounded-xl bg-[#123b69] px-4 py-2.5 text-sm font-bold text-white"
              >
                عرض
              </button>
            </form>

            <Link
              href={`/finance/reports?period=month&month=${nextMonth}`}
              className="rounded-xl border border-[#e1e7ef] bg-white px-4 py-2.5 text-sm font-bold text-[#17385f] transition hover:bg-slate-50"
            >
              الشهر التالي
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[#e5ebf2] bg-white px-5 py-4 text-sm font-bold text-[#17385f]">
        الفترة الحالية: {periodLabel}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <ReportCard
          title="المبيعات"
          value={formatMoney(
            snapshot.salesCents,
          )}
          detail={`فواتير ${formatMoney(
            snapshot.invoiceSalesCents,
          )} • اشتراكات ${formatMoney(
            snapshot.subscriptionSalesCents,
          )}`}
        />

        <ReportCard
          title="المتحصل"
          value={formatMoney(
            snapshot.collectionsCents,
          )}
          detail="فلوس دخلت فعليًا خلال الفترة"
        />

        <ReportCard
          title="المصروفات"
          value={formatMoney(
            snapshot.expensesCents,
          )}
          detail="فلوس خرجت فعليًا خلال الفترة"
        />

        <ReportCard
          title="صافي التدفق النقدي"
          value={formatMoney(
            snapshot.netCashFlowCents,
          )}
          detail="المتحصل − المصروفات"
        />

        <ReportCard
          title="المستحقات الحالية"
          value={formatMoney(
            snapshot.receivablesCents,
          )}
          detail="رصيد العملاء غير المحصل حتى الآن"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-[24px] border border-[#e5ebf2] bg-white p-5 md:p-6">
          <h2 className="text-xl font-black text-[#102f55]">
            توزيع التحصيل
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            حسب طريقة الدفع في {periodLabel}
          </p>

          <div className="mt-5 space-y-3">
            {paymentMethods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                لا توجد تحصيلات في الفترة
              </div>
            ) : (
              paymentMethods.map((item) => (
                <div
                  key={item.paymentMethod}
                  className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-4 py-3"
                >
                  <span className="font-bold text-[#17385f]">
                    {item.label}
                  </span>

                  <span className="font-black text-[#102f55]">
                    {formatMoney(
                      item.amountCents,
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e5ebf2] bg-white p-5 md:p-6">
          <h2 className="text-xl font-black text-[#102f55]">
            مؤشرات المتابعة
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SmallMetric
              label="عدد الفواتير"
              value={snapshot.invoiceCount.toLocaleString(
                "ar-EG",
              )}
            />

            <SmallMetric
              label="الفواتير المفتوحة"
              value={snapshot.openInvoiceCount.toLocaleString(
                "ar-EG",
              )}
            />

            <SmallMetric
              label="عدد الاشتراكات"
              value={snapshot.subscriptionCount.toLocaleString(
                "ar-EG",
              )}
            />

            <SmallMetric
              label="المتحصل من الاشتراكات"
              value={formatMoney(
                snapshot.subscriptionCollectionsCents,
              )}
            />
          </div>

          <div className="mt-5 rounded-2xl bg-[#fffaf4] p-4 text-sm font-medium leading-7 text-[#87511d]">
            “صافي التدفق النقدي” هو التحصيلات ناقص المصروفات، وليس صافي الربح المحاسبي.
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(15,47,85,0.05)]">
      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-black text-[#102f55]">
        {value}
      </p>

      <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-4">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-[#102f55]">
        {value}
      </p>
    </div>
  );
}
