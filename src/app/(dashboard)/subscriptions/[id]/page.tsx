import AddPaymentModal from "@/components/subscriptions/AddPaymentModal";
import { prisma } from "@/lib/prisma";
import {
  CreditCard,
  Wallet,
  Calendar,
} from "lucide-react";

export default async function SubscriptionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subscription =
    await prisma.subscription.findUnique({
      where: { id },
      include: {
        client: true,
        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    });

  if (!subscription) {
    return (
      <div className="p-8">
        الاشتراك غير موجود
      </div>
    );
  }

  const total =
    subscription.totalAmount;

  const paid =
    subscription.paidAmount;

  const percentage =
    total > 0
      ? Math.round(
          (paid / total) * 100
        )
      : 0;

  const isExpired =
    new Date(subscription.endDate) <
    new Date();

  const status = isExpired
    ? "EXPIRED"
    : "ACTIVE";

  const daysLeft = isExpired
    ? 0
    : Math.ceil(
        (new Date(
          subscription.endDate
        ).getTime() -
          Date.now()) /
          (1000 * 60 * 60 * 24)
      );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          تفاصيل الاشتراك
        </h1>

        <p className="text-slate-500 mt-2">
          {subscription.client.name}
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-slate-500">
                إجمالي السعر
              </p>

              <h3 className="text-2xl font-bold mt-2">
                {subscription.totalAmount} ج
              </h3>
            </div>

            <CreditCard />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-slate-500">
                المدفوع
              </p>

              <h3 className="text-2xl font-bold mt-2 text-green-600">
                {subscription.paidAmount} ج
              </h3>
            </div>

            <Wallet />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-slate-500">
                المتبقي
              </p>

              <h3 className="text-2xl font-bold mt-2 text-orange-500">
                {subscription.remainingAmount} ج
              </h3>
            </div>

            <Wallet />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-slate-500">
                الأيام المتبقية
              </p>

              <h3 className="text-2xl font-bold mt-2">
                {daysLeft}
              </h3>
            </div>

            <Calendar />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h2 className="font-bold text-xl mb-4">
          بيانات الاشتراك
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <strong>العميل:</strong>{" "}
            {subscription.client.name}
          </div>

          <div>
            <strong>الباقة:</strong>{" "}
            {subscription.planName}
          </div>

          <div>
            <strong>البداية:</strong>{" "}
            {new Date(
              subscription.startDate
            ).toLocaleDateString()}
          </div>

          <div>
            <strong>النهاية:</strong>{" "}
            {new Date(
              subscription.endDate
            ).toLocaleDateString()}
          </div>

          <div>
            <strong>الحالة:</strong>{" "}
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {status}
            </span>
          </div>

          <div>
            <strong>نسبة السداد:</strong>{" "}
            {percentage}%
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h2 className="font-bold text-xl mb-4">
          الملاحظات
        </h2>

        <p>
          {subscription.notes ||
            "لا توجد ملاحظات"}
        </p>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl">
            الدفعات
          </h2>

          <AddPaymentModal
            subscriptionId={
              subscription.id
            }
          />
        </div>

        {subscription.payments
          .length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            لا توجد دفعات حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3">
                    المبلغ
                  </th>

                  <th className="text-right p-3">
                    التاريخ
                  </th>

                  <th className="text-right p-3">
                    الملاحظات
                  </th>
                </tr>
              </thead>

              <tbody>
                {subscription.payments.map(
                  (payment) => (
                    <tr
                      key={payment.id}
                      className="border-b"
                    >
                      <td className="p-3 font-medium text-green-600">
                        {payment.amount} ج
                      </td>

                      <td className="p-3">
                        {new Date(
                          payment.paymentDate
                        ).toLocaleDateString()}
                      </td>

                      <td className="p-3">
                        {payment.notes ||
                          "-"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}