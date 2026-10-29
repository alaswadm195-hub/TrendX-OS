"use client";

import { useMemo, useState } from "react";
import ViewSubscriptionButton from "./ViewSubscriptionButton";
import DeleteSubscriptionButton from "./DeleteSubscriptionButton";
import EditSubscriptionModal from "./EditSubscriptionModal";

type Subscription = {
  id: string;
  clientId: string;
  planName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  startDate: Date | string;
  endDate: Date | string;
  // Calculated on the server in subscriptions/page.tsx.
  status: string;
  notes?: string | null;
  client: {
    name: string;
  };
};

type SubscriptionTab = "CURRENT" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "ALL";

type EffectiveStatus = "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";

const tabs: { key: SubscriptionTab; title: string }[] = [
  { key: "CURRENT", title: "الحالية" },
  { key: "COMPLETED", title: "المكتملة" },
  { key: "EXPIRED", title: "المنتهية" },
  { key: "CANCELLED", title: "الملغاة" },
  { key: "ALL", title: "الكل" },
];

const statusStyle: Record<EffectiveStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: "نشطة",
    className: "bg-green-100 text-green-700",
  },
  COMPLETED: {
    label: "مكتملة استخدامًا",
    className: "bg-blue-100 text-blue-700",
  },
  EXPIRED: {
    label: "منتهية",
    className: "bg-red-100 text-red-700",
  },
  CANCELLED: {
    label: "ملغاة",
    className: "bg-slate-100 text-slate-700",
  },
};

function displayFinancialAmount(subscription: Subscription, amount: number) {
  return subscription.status === "CANCELLED"
    ? <span className="text-xs text-slate-400" title="محفوظ للمراجعة فقط">مستبعد ماليًا</span>
    : <>{amount} ج</>;
}

function statusInfo(status: string) {
  return statusStyle[status as EffectiveStatus] ?? {
    label: status || "غير محددة",
    className: "bg-amber-100 text-amber-800",
  };
}

function matchesTab(status: string, tab: SubscriptionTab): boolean {
  switch (tab) {
    case "CURRENT":
      // Keep completed subscriptions visible here until pending delivery /
      // publishing work can be determined from the tracking data.
      return status === "ACTIVE" || status === "COMPLETED";
    case "ALL":
      return true;
    default:
      return status === tab;
  }
}

/** Keep the existing stable UTC date display to avoid hydration differences. */
function formatDate(date: Date | string) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "-";

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function StatusBadge({ status, mobile = false }: { status: string; mobile?: boolean }) {
  const { label, className } = statusInfo(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 font-medium whitespace-nowrap ${
        mobile ? "text-xs" : "text-sm"
      } ${className}`}
    >
      {label}
    </span>
  );
}

export default function SubscriptionsTable({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState<SubscriptionTab>("CURRENT");

  const counts = useMemo(() => {
    const result: Record<SubscriptionTab, number> = {
      CURRENT: 0,
      COMPLETED: 0,
      EXPIRED: 0,
      CANCELLED: 0,
      ALL: subscriptions.length,
    };

    for (const subscription of subscriptions) {
      if (matchesTab(subscription.status, "CURRENT")) result.CURRENT++;
      if (subscription.status === "COMPLETED") result.COMPLETED++;
      if (subscription.status === "EXPIRED") result.EXPIRED++;
      if (subscription.status === "CANCELLED") result.CANCELLED++;
    }

    return result;
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return subscriptions.filter((subscription) => {
      if (!matchesTab(subscription.status, selectedTab)) return false;
      if (!query) return true;

      const clientName = subscription.client?.name?.toLocaleLowerCase() ?? "";
      const planName = subscription.planName?.toLocaleLowerCase() ?? "";

      return clientName.includes(query) || planName.includes(query);
    });
  }, [subscriptions, search, selectedTab]);

  const emptyMessage = search.trim()
    ? "لا توجد اشتراكات تطابق البحث في هذا القسم"
    : "لا توجد اشتراكات في هذا القسم";

  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      {/* Status tabs: show archived subscriptions on demand, without deleting data. */}
      <div className="border-b px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-4" aria-label="تصفية الاشتراكات حسب الحالة">
          {tabs.map((tab) => {
            const isSelected = selectedTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedTab(tab.key)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.title} <span className="ms-1 opacity-80">({counts[tab.key]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search applies within the selected tab. */}
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="search"
            aria-label="البحث عن اشتراك"
            placeholder="ابحث باسم العميل أو الباقة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pr-4 pl-10 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />

          <svg
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-4">
        {filteredSubscriptions.length === 0 && (
          <div className="text-center text-slate-500 py-8">{emptyMessage}</div>
        )}

        {filteredSubscriptions.map((subscription) => (
          <div key={subscription.id} className="border rounded-2xl p-4 bg-white">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="font-bold text-lg break-words">
                  {subscription.client?.name || "-"}
                </h3>
                <p className="text-slate-500 text-sm mt-1 break-words">
                  {subscription.planName}
                </p>
              </div>

              <StatusBadge status={subscription.status} mobile />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">الإجمالي</p>
                <p className="font-semibold mt-1">{displayFinancialAmount(subscription, subscription.totalAmount)}</p>
              </div>
              <div>
                <p className="text-slate-500">المدفوع</p>
                <p className="font-semibold text-green-600 mt-1">{displayFinancialAmount(subscription, subscription.paidAmount)}</p>
              </div>
              <div>
                <p className="text-slate-500">المتبقي</p>
                <p className="font-semibold text-orange-500 mt-1">{displayFinancialAmount(subscription, subscription.remainingAmount)}</p>
              </div>
              <div>
                <p className="text-slate-500">النهاية</p>
                <p className="font-semibold mt-1">{formatDate(subscription.endDate)}</p>
              </div>
              <div>
                <p className="text-slate-500">البداية</p>
                <p className="font-semibold mt-1">{formatDate(subscription.startDate)}</p>
              </div>
            </div>

            {subscription.notes && (
              <div className="mt-4">
                <p className="text-slate-500 text-sm mb-1">ملاحظات</p>
                <p className="text-sm break-words">{subscription.notes}</p>
              </div>
            )}

            <div className="flex justify-center gap-5 mt-4 pt-4 border-t">
              <ViewSubscriptionButton id={subscription.id} />
              <EditSubscriptionModal subscription={subscription} />
              <DeleteSubscriptionButton id={subscription.id} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 text-right">العميل</th>
              <th className="p-4 text-right">الباقة</th>
              <th className="p-4 text-right">الإجمالي</th>
              <th className="p-4 text-right">المدفوع</th>
              <th className="p-4 text-right">المتبقي</th>
              <th className="p-4 text-right">البداية</th>
              <th className="p-4 text-right">النهاية</th>
              <th className="p-4 text-right">الملاحظات</th>
              <th className="p-4 text-center">الحالة</th>
              <th className="p-4 text-center">الإجراءات</th>
            </tr>
          </thead>

          <tbody>
            {filteredSubscriptions.map((subscription) => (
              <tr key={subscription.id} className="border-b hover:bg-slate-50">
                <td className="p-4 font-medium">{subscription.client?.name || "-"}</td>
                <td className="p-4">{subscription.planName}</td>
                <td className="p-4">{displayFinancialAmount(subscription, subscription.totalAmount)}</td>
                <td className="p-4 text-green-600">{displayFinancialAmount(subscription, subscription.paidAmount)}</td>
                <td className="p-4 text-orange-500">{displayFinancialAmount(subscription, subscription.remainingAmount)}</td>
                <td className="p-4">{formatDate(subscription.startDate)}</td>
                <td className="p-4">{formatDate(subscription.endDate)}</td>
                <td className="p-4 max-w-xs">
                  <div className="truncate" title={subscription.notes || ""}>
                    {subscription.notes || "-"}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <StatusBadge status={subscription.status} />
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-3">
                    <ViewSubscriptionButton id={subscription.id} />
                    <EditSubscriptionModal subscription={subscription} />
                    <DeleteSubscriptionButton id={subscription.id} />
                  </div>
                </td>
              </tr>
            ))}

            {filteredSubscriptions.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center p-8 text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
