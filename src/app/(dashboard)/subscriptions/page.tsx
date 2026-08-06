import { prisma } from "@/lib/prisma";
import SubscriptionsTable from "@/components/subscriptions/SubscriptionsTable";
import AddSubscriptionModal from "@/components/subscriptions/AddSubscriptionModal";

import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Wallet,
} from "lucide-react";

export default async function SubscriptionsPage() {
  const rawSubscriptions =
    await prisma.subscription.findMany({
      include: {
        client: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const today = new Date();

  const subscriptions =
    rawSubscriptions.map((sub) => ({
      ...sub,
      status:
        new Date(sub.endDate) < today
          ? "EXPIRED"
          : "ACTIVE",
    }));

  const activeSubscriptions =
    subscriptions.filter(
      (sub) => sub.status === "ACTIVE"
    );

  const expiredSubscriptions =
    subscriptions.filter(
      (sub) => sub.status === "EXPIRED"
    );

  const totalRemaining =
    subscriptions.reduce(
      (sum, sub) =>
        sum + sub.remainingAmount,
      0
    );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            الاشتراكات
          </h1>

          <p className="text-slate-500 mt-1 text-sm md:text-base">
            إدارة جميع اشتراكات العملاء
          </p>
        </div>

        <div className="w-full md:w-auto">
          <AddSubscriptionModal />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                إجمالي الاشتراكات
              </p>

              <h3 className="text-2xl md:text-3xl font-bold mt-2">
                {subscriptions.length}
              </h3>
            </div>

            <CreditCard
              size={24}
              className="text-blue-600"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                النشطة
              </p>

              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-green-600">
                {activeSubscriptions.length}
              </h3>
            </div>

            <CheckCircle
              size={24}
              className="text-green-600"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                المنتهية
              </p>

              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-red-600">
                {expiredSubscriptions.length}
              </h3>
            </div>

            <AlertTriangle
              size={24}
              className="text-red-600"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs md:text-sm text-slate-500">
                المتبقي
              </p>

              <h3 className="text-xl md:text-3xl font-bold mt-2 text-orange-500">
                {totalRemaining} ج
              </h3>
            </div>

            <Wallet
              size={24}
              className="text-orange-500"
            />
          </div>
        </div>
      </div>

      <SubscriptionsTable
        subscriptions={subscriptions}
      />
    </div>
  );
}