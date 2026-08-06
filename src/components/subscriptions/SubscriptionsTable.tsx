"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
  startDate: Date;
  endDate: Date;
  status: string;
  notes?: string | null;
  client: {
    name: string;
  };
};

export default function SubscriptionsTable({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const [search, setSearch] = useState("");

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(
      (subscription) =>
        subscription.client.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        subscription.planName
          .toLowerCase()
          .includes(search.toLowerCase())
    );
  }, [subscriptions, search]);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-4 md:p-5 border-b">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="ابحث عن اشتراك..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full h-11 pl-10 pr-4 border rounded-xl"
          />
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden p-4 space-y-4">
        {filteredSubscriptions.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            لا توجد اشتراكات
          </div>
        )}

        {filteredSubscriptions.map(
          (subscription) => (
            <div
              key={subscription.id}
              className="border rounded-2xl p-4 bg-white"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">
                    {subscription.client.name}
                  </h3>

                  <p className="text-slate-500 text-sm">
                    {subscription.planName}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    subscription.status ===
                    "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {subscription.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">
                    الإجمالي
                  </p>

                  <p className="font-semibold">
                    {subscription.totalAmount} ج
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    المدفوع
                  </p>

                  <p className="font-semibold text-green-600">
                    {subscription.paidAmount} ج
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    المتبقي
                  </p>

                  <p className="font-semibold text-orange-500">
                    {subscription.remainingAmount} ج
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    النهاية
                  </p>

                  <p className="font-semibold">
                    {new Date(
                      subscription.endDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {subscription.notes && (
                <div className="mt-4">
                  <p className="text-slate-500 text-sm mb-1">
                    ملاحظات
                  </p>

                  <p className="text-sm">
                    {subscription.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-center gap-5 mt-4 pt-4 border-t">
                <ViewSubscriptionButton
                  id={subscription.id}
                />

                <EditSubscriptionModal
                  subscription={
                    subscription
                  }
                />

                <DeleteSubscriptionButton
                  id={subscription.id}
                />
              </div>
            </div>
          )
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 text-right">
                العميل
              </th>

              <th className="p-4 text-right">
                الباقة
              </th>

              <th className="p-4 text-right">
                الإجمالي
              </th>

              <th className="p-4 text-right">
                المدفوع
              </th>

              <th className="p-4 text-right">
                المتبقي
              </th>

              <th className="p-4 text-right">
                البداية
              </th>

              <th className="p-4 text-right">
                النهاية
              </th>

              <th className="p-4 text-right">
                الملاحظات
              </th>

              <th className="p-4 text-center">
                الحالة
              </th>

              <th className="p-4 text-center">
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredSubscriptions.map(
              (subscription) => (
                <tr
                  key={subscription.id}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="p-4 font-medium">
                    {subscription.client.name}
                  </td>

                  <td className="p-4">
                    {subscription.planName}
                  </td>

                  <td className="p-4">
                    {subscription.totalAmount} ج
                  </td>

                  <td className="p-4 text-green-600">
                    {subscription.paidAmount} ج
                  </td>

                  <td className="p-4 text-orange-500">
                    {subscription.remainingAmount} ج
                  </td>

                  <td className="p-4">
                    {new Date(
                      subscription.startDate
                    ).toLocaleDateString()}
                  </td>

                  <td className="p-4">
                    {new Date(
                      subscription.endDate
                    ).toLocaleDateString()}
                  </td>

                  <td className="p-4 max-w-xs">
                    <div
                      className="truncate"
                      title={
                        subscription.notes ||
                        ""
                      }
                    >
                      {subscription.notes ||
                        "-"}
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        subscription.status ===
                        "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : subscription.status ===
                              "EXPIRED"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {subscription.status}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-3">
                      <ViewSubscriptionButton
                        id={subscription.id}
                      />

                      <EditSubscriptionModal
                        subscription={
                          subscription
                        }
                      />

                      <DeleteSubscriptionButton
                        id={subscription.id}
                      />
                    </div>
                  </td>
                </tr>
              )
            )}

            {filteredSubscriptions.length ===
              0 && (
              <tr>
                <td
                  colSpan={10}
                  className="text-center p-8 text-slate-500"
                >
                  لا توجد اشتراكات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}