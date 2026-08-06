import AddPaymentModal from "@/components/finance/AddPaymentModal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoiceDetailsPage({
  params,
}: Props) {
  const { id } = await params;

  const invoice =
    await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    });

  if (!invoice) {
    notFound();
  }

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
              {new Date(
                invoice.createdAt
              ).toLocaleString(
                "ar-EG",
                {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }
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
            {invoice.totalAmount} ج
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المدفوع
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {invoice.paidAmount} ج
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المتبقي
          </p>

          <h3 className="text-3xl font-bold mt-2 text-orange-500">
            {invoice.remainingAmount} ج
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            سجل الدفعات
          </h2>

          {invoice.status !==
            "PAID" && (
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
                      {new Date(
                        payment.paymentDate
                      ).toLocaleString(
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
                        }
                      )}
                    </td>

                    <td className="p-4 text-green-600 font-semibold">
                      {
                        payment.amount
                      }{" "}
                      ج
                    </td>

                    <td className="p-4">
                      {payment.notes ||
                        "-"}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}