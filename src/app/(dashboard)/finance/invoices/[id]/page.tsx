import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

import AddPaymentModal from "@/components/finance/AddPaymentModal";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function InvoiceDetailsPage({
  params,
}: Props) {
  await requireAdmin();

  const { id } =
    await params;

  const rawInvoice =
    await prisma.invoice.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        title: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        createdAt: true,

        payments: {
          select: {
            id: true,
            amount: true,
            notes: true,
            paymentDate: true,
          },

          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    });

  if (!rawInvoice) {
    notFound();
  }

  /*
   * Normalize current Float values and future Prisma.Decimal values to plain
   * numbers before rendering them in React or passing them to client code.
   */
  const invoice = {
    ...rawInvoice,

    totalAmount:
      moneyToNumber(
        rawInvoice.totalAmount,
      ),

    paidAmount:
      moneyToNumber(
        rawInvoice.paidAmount,
      ),

    remainingAmount:
      moneyToNumber(
        rawInvoice.remainingAmount,
      ),

    payments:
      rawInvoice.payments.map(
        (payment) => ({
          ...payment,

          amount:
            moneyToNumber(
              payment.amount,
            ),
        }),
      ),
  };

  const canAddPayment =
    invoice.status !== "PAID" &&
    invoice.status !== "CANCELLED" &&
    invoice.remainingAmount > 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h1 className="text-3xl font-bold mb-6">
          تفاصيل الفاتورة
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-slate-500">
              العميل
            </p>

            <p className="font-semibold mt-1">
              {invoice.customerName ||
                "عميل"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">
              الهاتف
            </p>

            <p className="font-semibold mt-1">
              {invoice.customerPhone ||
                "-"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">
              الخدمة
            </p>

            <p className="font-semibold mt-1">
              {invoice.title}
            </p>
          </div>

          <div>
            <p className="text-slate-500">
              تاريخ الإنشاء
            </p>

            <p className="font-semibold mt-1">
              {invoice.createdAt.toLocaleString(
                "ar-EG",
                {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            الإجمالي
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {invoice.totalAmount.toLocaleString(
              "ar-EG",
            )}{" "}
            ج
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المدفوع
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {invoice.paidAmount.toLocaleString(
              "ar-EG",
            )}{" "}
            ج
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المتبقي
          </p>

          <h3 className="text-3xl font-bold mt-2 text-orange-500">
            {invoice.remainingAmount.toLocaleString(
              "ar-EG",
            )}{" "}
            ج
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            سجل الدفعات
          </h2>

          {canAddPayment && (
            <AddPaymentModal
              invoiceId={
                invoice.id
              }
            />
          )}
        </div>

        {invoice.payments.length ===
        0 ? (
          <div className="text-center py-12 text-slate-500">
            لا توجد دفعات
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-right p-4">
                    التاريخ والوقت
                  </th>

                  <th className="text-right p-4">
                    المبلغ
                  </th>

                  <th className="text-right p-4">
                    الملاحظات
                  </th>
                </tr>
              </thead>

              <tbody>
                {invoice.payments.map(
                  (payment) => (
                    <tr
                      key={
                        payment.id
                      }
                      className="border-b"
                    >
                      <td className="p-4">
                        {payment.paymentDate.toLocaleString(
                          "ar-EG",
                          {
                            year:
                              "numeric",
                            month:
                              "2-digit",
                            day:
                              "2-digit",
                            hour:
                              "2-digit",
                            minute:
                              "2-digit",
                          },
                        )}
                      </td>

                      <td className="p-4 text-green-600 font-semibold">
                        {payment.amount.toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ج
                      </td>

                      <td className="p-4">
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
