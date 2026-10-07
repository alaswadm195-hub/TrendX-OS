import type { ReactNode } from "react";
import AddPaymentModal from "@/components/subscriptions/AddPaymentModal";
import SubscriptionUsagePanel from "@/components/subscriptions/SubscriptionUsagePanel";
import SubscriptionContentPanel from "@/components/subscriptions/SubscriptionContentPanel";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

import {
  CreditCard,
  Wallet,
  Calendar,
} from "lucide-react";

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
      : Number(
          value.toString(),
        );

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
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

  if (
    !Number.isSafeInteger(
      cents,
    )
  ) {
    throw new Error(
      "Monetary value is out of range",
    );
  }

  return cents;
}

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

export default async function SubscriptionDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  await requireAdmin();

  const { id } =
    await params;

  const rawSubscription =
    await prisma.subscription.findUnique(
      {
        where: {
          id,
        },

        select: {
          id: true,
          serviceCategory:
            true,
          planName: true,
          includedMinutes:
            true,
          completedAt:
            true,
          totalAmount: true,
          paidAmount: true,
          remainingAmount:
            true,
          startDate: true,
          endDate: true,
          notes: true,
          status: true,

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
              paymentDate:
                true,
            },

            orderBy: {
              paymentDate:
                "desc",
            },
          },

          usageSessions: {
            select: {
              id: true,
              startAt: true,
              endAt: true,
              durationMinutes:
                true,
              notes: true,
              archivedAt: true,
            },

            orderBy: {
              startAt:
                "desc",
            },
          },

          contentQuotas: {
            select: {
              id: true,
              contentType: true,
              totalCount: true,
            },
            orderBy: {
              contentType: "asc",
            },
          },

          contentItems: {
            select: {
              id: true,
              contentType: true,
              status: true,
              producedAt: true,
              editedAt: true,
              scheduledAt: true,
              publishedAt: true,
              notes: true,
              archivedAt: true,
            },
            orderBy: {
              producedAt: "desc",
            },
          },
        },
      },
    );

  if (!rawSubscription) {
    return (
      <div className="p-8">
        الاشتراك غير موجود
      </div>
    );
  }

  const subscription = {
    ...rawSubscription,

    totalAmount:
      moneyToNumber(
        rawSubscription.totalAmount,
      ),

    paidAmount:
      moneyToNumber(
        rawSubscription.paidAmount,
      ),

    remainingAmount:
      moneyToNumber(
        rawSubscription.remainingAmount,
      ),

    payments:
      rawSubscription.payments.map(
        (payment) => ({
          ...payment,

          amount:
            moneyToNumber(
              payment.amount,
            ),
        }),
      ),
  };

  const totalCents =
    toCents(
      subscription.totalAmount,
    );

  const paidCents =
    toCents(
      subscription.paidAmount,
    );

  const percentage =
    totalCents > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (paidCents /
                totalCents) *
                100,
            ),
          ),
        )
      : 0;

  const now = new Date();

  const isExpired =
    subscription.endDate <
    now;

  const effectiveStatus =
    subscription.status ===
    "CANCELLED"
      ? "CANCELLED"
      : subscription.completedAt
        ? "COMPLETED"
        : isExpired
          ? "EXPIRED"
          : "ACTIVE";

  const trackingStatus =
    subscription.status ===
    "CANCELLED"
      ? "CANCELLED"
      : isExpired
        ? "EXPIRED"
        : "ACTIVE";

  const daysLeft =
    effectiveStatus !== "ACTIVE"
      ? 0
      : Math.max(
          0,
          Math.ceil(
            (subscription.endDate.getTime() -
              now.getTime()) /
              (1000 *
                60 *
                60 *
                24),
          ),
        );

  const statusClasses =
    effectiveStatus === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : effectiveStatus ===
          "COMPLETED"
        ? "bg-blue-100 text-blue-700"
        : effectiveStatus ===
            "CANCELLED"
          ? "bg-slate-100 text-slate-700"
          : "bg-red-100 text-red-700";

  const statusLabel =
    effectiveStatus === "ACTIVE"
      ? "ACTIVE"
      : effectiveStatus ===
          "COMPLETED"
        ? "مكتملة استخدامًا"
        : effectiveStatus ===
            "CANCELLED"
          ? "CANCELLED"
          : "EXPIRED";

  return (
    <div
      dir="rtl"
      className="p-6 lg:p-8"
    >
      <div className="mb-8">
        <p className="text-sm font-bold text-[#f28a32]">
          Subscription
        </p>

        <h1 className="mt-1 text-3xl font-black text-[#102f55]">
          تفاصيل الاشتراك
        </h1>

        <p className="mt-2 text-slate-500">
          {
            subscription
              .client.name
          }
        </p>
      </div>

      <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="إجمالي السعر"
          value={`${subscription.totalAmount.toLocaleString(
            "ar-EG",
          )} ج`}
          icon={<CreditCard />}
        />

        <SummaryCard
          label="المدفوع"
          value={`${subscription.paidAmount.toLocaleString(
            "ar-EG",
          )} ج`}
          valueClassName="text-green-600"
          icon={<Wallet />}
        />

        <SummaryCard
          label="المتبقي ماليًا"
          value={`${subscription.remainingAmount.toLocaleString(
            "ar-EG",
          )} ج`}
          valueClassName="text-orange-500"
          icon={<Wallet />}
        />

        <SummaryCard
          label="الأيام المتبقية"
          value={daysLeft.toLocaleString(
            "ar-EG",
          )}
          icon={<Calendar />}
        />
      </div>

      <div className="mb-6 rounded-[24px] border border-[#e5ebf2] bg-white p-6">
        <h2 className="mb-4 text-xl font-black text-[#102f55]">
          بيانات الاشتراك
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow
            label="العميل"
            value={
              subscription
                .client.name
            }
          />

          <InfoRow
            label="القسم الرئيسي"
            value={
              subscription.serviceCategory
                ? categoryLabels[
                    subscription
                      .serviceCategory
                  ]
                : "غير محدد"
            }
          />

          <InfoRow
            label="الباقة"
            value={
              subscription.planName
            }
          />

          <InfoRow
            label="البداية"
            value={subscription.startDate.toLocaleDateString(
              "ar-EG",
            )}
          />

          <InfoRow
            label="النهاية"
            value={subscription.endDate.toLocaleDateString(
              "ar-EG",
            )}
          />

          <div>
            <strong>
              الحالة:
            </strong>{" "}
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${statusClasses}`}
            >
              {statusLabel}
            </span>
          </div>

          <InfoRow
            label="نسبة السداد"
            value={`${percentage.toLocaleString(
              "ar-EG",
            )}%`}
          />

          <InfoRow
            label="نظام الساعات"
            value={
              subscription.includedMinutes
                ? "مفعّل"
                : "غير مفعّل"
            }
          />
        </div>
      </div>

      <div className="mb-6 rounded-[24px] border border-[#e5ebf2] bg-white p-6">
        <h2 className="mb-4 text-xl font-black text-[#102f55]">
          الملاحظات
        </h2>

        <p className="text-slate-600">
          {subscription.notes ||
            "لا توجد ملاحظات"}
        </p>
      </div>

      <div className="mb-6">
        {subscription.serviceCategory ===
        "SCREEN_PACKAGES" ? (
          <SubscriptionUsagePanel
            subscriptionId={
              subscription.id
            }
            status={trackingStatus}
            includedMinutes={
              subscription.includedMinutes
            }
            completedAt={
              subscription.completedAt?.toISOString() ??
              null
            }
            sessions={subscription.usageSessions.map(
              (session) => ({
                ...session,
                startAt:
                  session.startAt.toISOString(),
                endAt:
                  session.endAt.toISOString(),
                archivedAt:
                  session.archivedAt?.toISOString() ??
                  null,
              }),
            )}
          />
        ) : subscription.serviceCategory ===
          "PAGE_MANAGEMENT" ? (
          <SubscriptionContentPanel
            subscriptionId={
              subscription.id
            }
            status={trackingStatus}
            completedAt={
              subscription.completedAt?.toISOString() ??
              null
            }
            quotas={
              subscription.contentQuotas
            }
            items={subscription.contentItems.map(
              (item) => ({
                ...item,
                producedAt:
                  item.producedAt.toISOString(),
                editedAt:
                  item.editedAt?.toISOString() ??
                  null,
                scheduledAt:
                  item.scheduledAt?.toISOString() ??
                  null,
                publishedAt:
                  item.publishedAt?.toISOString() ??
                  null,
                archivedAt:
                  item.archivedAt?.toISOString() ??
                  null,
              }),
            )}
          />
        ) : null}
      </div>

      <div className="rounded-[24px] border border-[#e5ebf2] bg-white p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#102f55]">
              الدفعات
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الدفعات المالية
              مستقلة عن استهلاك
              ساعات الباقة
            </p>
          </div>

          {trackingStatus !==
            "CANCELLED" &&
            subscription.remainingAmount >
              0 && (
              <AddPaymentModal
                subscriptionId={
                  subscription.id
                }
              />
            )}
        </div>

        {subscription.payments
          .length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            لا توجد دفعات حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-[#fafbfd]">
                  <th className="p-3 text-right">
                    المبلغ
                  </th>

                  <th className="p-3 text-right">
                    التاريخ
                  </th>

                  <th className="p-3 text-right">
                    الملاحظات
                  </th>
                </tr>
              </thead>

              <tbody>
                {subscription.payments.map(
                  (
                    payment,
                  ) => (
                    <tr
                      key={
                        payment.id
                      }
                      className="border-b last:border-0"
                    >
                      <td className="p-3 font-bold text-green-600">
                        {payment.amount.toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ج
                      </td>

                      <td className="p-3">
                        {payment.paymentDate.toLocaleDateString(
                          "ar-EG",
                        )}
                      </td>

                      <td className="p-3">
                        {payment.notes ||
                          "-"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  valueClassName = "text-[#102f55]",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(15,47,85,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">
            {label}
          </p>

          <h3
            className={`mt-2 text-2xl font-black ${valueClassName}`}
          >
            {value}
          </h3>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f8fc] text-[#123b69]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <strong>
        {label}:
      </strong>{" "}
      {value}
    </div>
  );
}
