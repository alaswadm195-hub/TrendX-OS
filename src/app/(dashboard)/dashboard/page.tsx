import Link from "next/link";

import StatCard from "@/components/dashboard/StatCard";
import AppointmentsTable, {
  type DashboardAppointment,
} from "@/components/dashboard/AppointmentsTable";
import RevenueChart from "@/components/dashboard/RevenueChart";
import ServicesChart, {
  type ServiceChartItem,
} from "@/components/dashboard/ServicesChart";
import TasksCard, {
  type DashboardTask,
} from "@/components/dashboard/TasksCard";

import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import {
  Users,
  Calendar,
  Wallet,
  CheckSquare,
  Repeat,
  DollarSign,
  Plus,
  ArrowUpLeft,
  Sparkles,
} from "lucide-react";

const TIME_ZONE =
  "Africa/Cairo";

type MoneyValue =
  | number
  | string
  | {
      toString(): string;
    }
  | null
  | undefined;

function moneyToCents(
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
      ? Number(
          value.toString(),
        )
      : Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return Math.round(
    numericValue * 100,
  );
}

function formatMoneyFromCents(
  cents: number,
) {
  return `${(
    cents / 100
  ).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  })} ج`;
}

function getZonedParts(
  date: Date,
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      },
    );

  const parts =
    formatter.formatToParts(
      date,
    );

  const getPart = (
    type: Intl.DateTimeFormatPartTypes,
  ) =>
    Number(
      parts.find(
        (part) =>
          part.type === type,
      )?.value ?? "0",
    );

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute:
      getPart("minute"),
    second:
      getPart("second"),
  };
}

function getTimeZoneOffsetMs(
  date: Date,
) {
  const parts =
    getZonedParts(date);

  const representedAsUtc =
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );

  return (
    representedAsUtc -
    date.getTime()
  );
}

function zonedDateTimeToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const normalized =
    new Date(
      Date.UTC(
        year,
        monthIndex,
        day,
        hour,
        minute,
        second,
      ),
    );

  const guess =
    new Date(
      Date.UTC(
        normalized.getUTCFullYear(),
        normalized.getUTCMonth(),
        normalized.getUTCDate(),
        hour,
        minute,
        second,
      ),
    );

  const firstOffset =
    getTimeZoneOffsetMs(
      guess,
    );

  const firstResult =
    new Date(
      guess.getTime() -
        firstOffset,
    );

  const secondOffset =
    getTimeZoneOffsetMs(
      firstResult,
    );

  return new Date(
    guess.getTime() -
      secondOffset,
  );
}

function addMonths(
  year: number,
  monthIndex: number,
  delta: number,
) {
  const date =
    new Date(
      Date.UTC(
        year,
        monthIndex + delta,
        1,
      ),
    );

  return {
    year:
      date.getUTCFullYear(),
    monthIndex:
      date.getUTCMonth(),
  };
}

function monthKeyFromDate(
  date: Date,
) {
  const parts =
    getZonedParts(date);

  return `${parts.year}-${String(
    parts.month,
  ).padStart(2, "0")}`;
}

function buildMonthKey(
  year: number,
  monthIndex: number,
) {
  return `${year}-${String(
    monthIndex + 1,
  ).padStart(2, "0")}`;
}

function monthLabel(
  year: number,
  monthIndex: number,
) {
  const sample =
    zonedDateTimeToUtc(
      year,
      monthIndex,
      15,
      12,
    );

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      timeZone: TIME_ZONE,
      month: "long",
    },
  ).format(sample);
}

export default async function DashboardPage() {
  const user =
    await requireAuth();

  const isAdmin =
    user.role === "ADMIN";

  const now =
    new Date();

  const cairoNow =
    getZonedParts(now);

  const todayStart =
    zonedDateTimeToUtc(
      cairoNow.year,
      cairoNow.month - 1,
      cairoNow.day,
    );

  const tomorrowStart =
    zonedDateTimeToUtc(
      cairoNow.year,
      cairoNow.month - 1,
      cairoNow.day + 1,
    );

  const currentMonth = {
    year: cairoNow.year,
    monthIndex:
      cairoNow.month - 1,
  };

  const sixMonthsAgo =
    addMonths(
      currentMonth.year,
      currentMonth.monthIndex,
      -5,
    );

  const nextMonth =
    addMonths(
      currentMonth.year,
      currentMonth.monthIndex,
      1,
    );

  const revenueRangeStart =
    zonedDateTimeToUtc(
      sixMonthsAgo.year,
      sixMonthsAgo.monthIndex,
      1,
    );

  const revenueRangeEnd =
    zonedDateTimeToUtc(
      nextMonth.year,
      nextMonth.monthIndex,
      1,
    );

  const employeeScope =
    !isAdmin &&
    user.employeeId
      ? {
          employeeId:
            user.employeeId,
        }
      : {};

  const [
    clientsCount,
    todayAppointmentsCount,
    activeTasksCount,
    activeSubscriptionsCount,
    appointmentRows,
    taskRows,
    subscriptionPlans,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        archivedAt: null,
      },
    }),

    prisma.appointment.count({
      where: {
        appointmentDate: {
          gte: todayStart,
          lt: tomorrowStart,
        },
        ...employeeScope,
      },
    }),

    prisma.task.count({
      where: {
        status: {
          in: [
            "TODO",
            "IN_PROGRESS",
            "REVIEW",
          ],
        },
        client: {
          archivedAt: null,
        },
        ...employeeScope,
      },
    }),

    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        client: {
          archivedAt: null,
        },
      },
    }),

    prisma.appointment.findMany(
      {
        where: {
          appointmentDate: {
            gte: todayStart,
            lt:
              tomorrowStart,
          },
          ...employeeScope,
        },
        orderBy: {
          appointmentDate:
            "asc",
        },
        take: 8,
        select: {
          id: true,
          title: true,
          appointmentDate:
            true,
          status: true,
          client: {
            select: {
              name: true,
            },
          },
          employee: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    ),

    prisma.task.findMany({
      where: {
        status: {
          in: [
            "TODO",
            "IN_PROGRESS",
            "REVIEW",
          ],
        },
        client: {
          archivedAt: null,
        },
        ...employeeScope,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 6,
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        priority: true,
        client: {
          select: {
            name: true,
          },
        },
        employee: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    prisma.subscription.findMany(
      {
        where: {
          status: {
            not: "CANCELLED",
          },
          client: {
            archivedAt: null,
          },
        },
        select: {
          serviceCategory: true,
        },
      },
    ),
  ]);

  const appointments:
    DashboardAppointment[] =
    appointmentRows.map(
      (appointment) => ({
        id: appointment.id,
        title:
          appointment.title,
        clientName:
          appointment.client
            .name,
        employeeName:
          appointment.employee
            ?.user.name ??
          "غير محدد",
        appointmentDate:
          appointment.appointmentDate.toISOString(),
        status:
          appointment.status,
      }),
    );

  const tasks: DashboardTask[] =
    taskRows.map(
      (task) => ({
        id: task.id,
        title: task.title,
        clientName:
          task.client.name,
        employeeName:
          task.employee.user
            .name,
        dueDate:
          task.dueDate.toISOString(),
        status: task.status,
        priority:
          task.priority,
      }),
    );

  const categoryLabels = {
    PAGE_MANAGEMENT:
      "إدارة الصفحات",
    SCREEN_PACKAGES:
      "باقات الشاشة",
    OUTDOOR_SHOOTING:
      "تصوير خارجي",
    INDOOR_SHOOTING:
      "تصوير داخلي",
  } as const;

  const serviceCounts =
    new Map<
      keyof typeof categoryLabels,
      number
    >([
      ["PAGE_MANAGEMENT", 0],
      ["SCREEN_PACKAGES", 0],
      ["OUTDOOR_SHOOTING", 0],
      ["INDOOR_SHOOTING", 0],
    ]);

  for (const item of
    subscriptionPlans) {
    if (
      !item.serviceCategory
    ) {
      continue;
    }

    serviceCounts.set(
      item.serviceCategory,
      (serviceCounts.get(
        item.serviceCategory,
      ) ?? 0) + 1,
    );
  }

  const servicesData:
    ServiceChartItem[] =
    Array.from(
      serviceCounts.entries(),
    ).map(
      ([category, value]) => ({
        name:
          categoryLabels[
            category
          ],
        value,
      }),
    );

  let monthlyRevenueCents =
    0;

  let todayIncomeCents =
    0;

  let currentBalanceCents =
    0;

  let revenueTrendText =
    "لا توجد إيرادات مسجلة";

  let revenueTrendPositive =
    true;

  const revenueData: {
    month: string;
    revenue: number;
  }[] = [];

  if (isAdmin) {
    const [
      subscriptionPayments,
      invoicePayments,
      allSubscriptionIncome,
      allInvoiceIncome,
      allExpenses,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: {
          paymentDate: {
            gte:
              revenueRangeStart,
            lt:
              revenueRangeEnd,
          },
        },
        select: {
          amount: true,
          paymentDate: true,
        },
        orderBy: {
          paymentDate:
            "asc",
        },
      }),

      prisma.invoicePayment.findMany(
        {
          where: {
            paymentDate: {
              gte:
                revenueRangeStart,
              lt:
                revenueRangeEnd,
            },
          },
          select: {
            amount: true,
            paymentDate:
              true,
          },
          orderBy: {
            paymentDate:
              "asc",
          },
        },
      ),

      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
      }),

      prisma.invoicePayment.aggregate(
        {
          _sum: {
            amount: true,
          },
        },
      ),

      prisma.expense.aggregate({
        _sum: {
          amount: true,
        },
      }),
    ]);

    const monthlyBuckets =
      new Map<
        string,
        number
      >();

    for (
      let offset = -5;
      offset <= 0;
      offset += 1
    ) {
      const item =
        addMonths(
          currentMonth.year,
          currentMonth.monthIndex,
          offset,
        );

      monthlyBuckets.set(
        buildMonthKey(
          item.year,
          item.monthIndex,
        ),
        0,
      );
    }

    const addPaymentToBuckets = (
      payment: {
        amount: MoneyValue;
        paymentDate: Date;
      },
    ) => {
      const amountCents =
        moneyToCents(
          payment.amount,
        );

      const key =
        monthKeyFromDate(
          payment.paymentDate,
        );

      if (
        monthlyBuckets.has(
          key,
        )
      ) {
        monthlyBuckets.set(
          key,
          (monthlyBuckets.get(
            key,
          ) ?? 0) +
            amountCents,
        );
      }

      if (
        payment.paymentDate >=
          todayStart &&
        payment.paymentDate <
          tomorrowStart
      ) {
        todayIncomeCents +=
          amountCents;
      }
    };

    subscriptionPayments.forEach(
      addPaymentToBuckets,
    );

    invoicePayments.forEach(
      addPaymentToBuckets,
    );

    for (
      let offset = -5;
      offset <= 0;
      offset += 1
    ) {
      const item =
        addMonths(
          currentMonth.year,
          currentMonth.monthIndex,
          offset,
        );

      const key =
        buildMonthKey(
          item.year,
          item.monthIndex,
        );

      revenueData.push({
        month: monthLabel(
          item.year,
          item.monthIndex,
        ),
        revenue:
          (monthlyBuckets.get(
            key,
          ) ?? 0) / 100,
      });
    }

    const currentKey =
      buildMonthKey(
        currentMonth.year,
        currentMonth.monthIndex,
      );

    const previousMonth =
      addMonths(
        currentMonth.year,
        currentMonth.monthIndex,
        -1,
      );

    const previousKey =
      buildMonthKey(
        previousMonth.year,
        previousMonth.monthIndex,
      );

    monthlyRevenueCents =
      monthlyBuckets.get(
        currentKey,
      ) ?? 0;

    const previousRevenueCents =
      monthlyBuckets.get(
        previousKey,
      ) ?? 0;

    if (
      previousRevenueCents > 0
    ) {
      const growth =
        Math.round(
          ((monthlyRevenueCents -
            previousRevenueCents) /
            previousRevenueCents) *
            100,
        );

      revenueTrendPositive =
        growth >= 0;

      revenueTrendText = `${
        growth > 0 ? "+" : ""
      }${growth}% مقارنة بالشهر الماضي`;
    } else if (
      monthlyRevenueCents > 0
    ) {
      revenueTrendText =
        "لا توجد إيرادات مسجلة في الشهر الماضي";
    }

    const allIncomeCents =
      moneyToCents(
        allSubscriptionIncome
          ._sum.amount,
      ) +
      moneyToCents(
        allInvoiceIncome._sum
          .amount,
      );

    const allExpenseCents =
      moneyToCents(
        allExpenses._sum.amount,
      );

    currentBalanceCents =
      allIncomeCents -
      allExpenseCents;
  }

  return (
    <div
      dir="rtl"
      className="min-h-full bg-[#f7f9fc] p-4 md:p-6 lg:p-8"
    >
      <section className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f28a32]">
            <Sparkles
              size={16}
            />

            <span>
              TrendX OS Dashboard
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#102f55] lg:text-[38px]">
            مرحبًا، {user.name} 👋
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">
            إليك ملخص النشاط
            الفعلي اليوم
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-[#123b69] to-[#0f2f55] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,47,85,0.18)] transition hover:-translate-y-0.5"
          >
            <Plus size={18} />
            إضافة عميل
          </Link>

          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#dfe6ef] bg-white px-4 py-3 text-sm font-bold text-[#17385f] shadow-sm transition hover:border-[#f1c18f] hover:bg-[#fffaf5]"
          >
            <Calendar
              size={18}
            />
            موعد جديد
          </Link>

          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#dfe6ef] bg-white px-4 py-3 text-sm font-bold text-[#17385f] shadow-sm transition hover:border-[#f1c18f] hover:bg-[#fffaf5]"
          >
            <CheckSquare
              size={18}
            />
            مهمة جديدة
          </Link>
        </div>
      </section>

      {isAdmin ? (
        <section className="relative mb-7 overflow-hidden rounded-[28px] bg-gradient-to-l from-[#0f2f55] via-[#123b69] to-[#173f70] p-6 text-white shadow-[0_18px_40px_rgba(15,47,85,0.18)] md:p-8">
          <div
            aria-hidden="true"
            className="absolute -left-12 -top-16 h-52 w-52 rounded-full bg-[#f28a32]/20 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-24 right-[18%] h-56 w-56 rounded-full bg-white/10 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute left-5 top-1/2 hidden -translate-y-1/2 opacity-10 md:block"
          >
            <ArrowUpLeft
              size={150}
              strokeWidth={1.2}
            />
          </div>

          <div className="relative z-10 flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-100">
                إجمالي إيرادات
                الشهر
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                {formatMoneyFromCents(
                  monthlyRevenueCents,
                )}
              </h2>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-sm">
                <ArrowUpLeft
                  size={16}
                  className={
                    revenueTrendPositive
                      ? "text-[#f5a344]"
                      : "rotate-180 text-red-300"
                  }
                />

                <span>
                  {
                    revenueTrendText
                  }
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-blue-100">
                مصدر البيانات
              </p>

              <p className="mt-1 text-sm font-bold">
                مدفوعات الاشتراكات
                والفواتير
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative mb-7 overflow-hidden rounded-[28px] bg-gradient-to-l from-[#0f2f55] to-[#173f70] p-6 text-white shadow-[0_18px_40px_rgba(15,47,85,0.18)] md:p-8">
          <p className="text-sm font-semibold text-blue-100">
            نشاطك اليوم
          </p>

          <h2 className="mt-3 text-3xl font-black">
            {activeTasksCount.toLocaleString(
              "ar-EG",
            )}{" "}
            مهمة نشطة •{" "}
            {todayAppointmentsCount.toLocaleString(
              "ar-EG",
            )}{" "}
            موعد اليوم
          </h2>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="إجمالي العملاء"
          value={clientsCount.toLocaleString(
            "ar-EG",
          )}
          icon={
            <Users className="text-[#1f5fae]" />
          }
        />

        <StatCard
          title="مواعيد اليوم"
          value={todayAppointmentsCount.toLocaleString(
            "ar-EG",
          )}
          icon={
            <Calendar className="text-emerald-600" />
          }
        />

        <StatCard
          title="المهام النشطة"
          value={activeTasksCount.toLocaleString(
            "ar-EG",
          )}
          icon={
            <CheckSquare className="text-violet-600" />
          }
        />

        <StatCard
          title="الاشتراكات النشطة"
          value={activeSubscriptionsCount.toLocaleString(
            "ar-EG",
          )}
          icon={
            <Repeat className="text-[#f28a32]" />
          }
        />
      </section>

      {isAdmin && (
        <section className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <StatCard
            title="دخل اليوم"
            value={formatMoneyFromCents(
              todayIncomeCents,
            )}
            icon={
              <DollarSign className="text-[#f28a32]" />
            }
          />

          <StatCard
            title="الرصيد الحالي"
            value={formatMoneyFromCents(
              currentBalanceCents,
            )}
            icon={
              <Wallet className="text-[#1598b7]" />
            }
          />
        </section>
      )}

      <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {isAdmin && (
          <div className="xl:col-span-2">
            <RevenueChart
              data={revenueData}
            />
          </div>
        )}

        <div
          className={
            isAdmin
              ? ""
              : "xl:col-span-3"
          }
        >
          <ServicesChart
            data={
              servicesData
            }
          />
        </div>
      </section>

      <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AppointmentsTable
            appointments={
              appointments
            }
            canManage={
              isAdmin
            }
          />
        </div>

        <TasksCard
          tasks={tasks}
        />
      </section>
    </div>
  );
}
