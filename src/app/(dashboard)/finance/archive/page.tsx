import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function InvoiceArchivePage() {
  await connection();

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "PAID",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  const totalInvoices = invoices.length;

  const totalSales = invoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0
  );

  const totalCollected = invoices.reduce(
    (sum, invoice) => sum + invoice.paidAmount,
    0
  );

  const lastClosedInvoice =
    invoices.length > 0 ? invoices[0].updatedAt : null;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">أرشيف الفواتير</h1>

        <p className="text-slate-500 mt-2">
          الفواتير المكتملة السداد فقط
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">عدد الفواتير</p>

          <h3 className="text-3xl font-bold mt-3">
            {totalInvoices}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">إجمالي المبيعات</p>

          <h3 className="text-3xl font-bold mt-3 text-green-600">
            {totalSales.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">إجمالي المتحصل</p>

          <h3 className="text-3xl font-bold mt-3 text-blue-600">
            {totalCollected.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">آخر عملية سداد</p>

          <h3 className="text-sm font-semibold mt-3">
            {lastClosedInvoice
              ? new Date(lastClosedInvoice).toLocaleString("ar-EG", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </h3>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">الفواتير المكتملة</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            لا توجد فواتير مكتملة حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-4 text-right">العميل</th>

                  <th className="p-4 text-right">الخدمة</th>

                  <th className="p-4 text-right">الإجمالي</th>

                  <th className="p-4 text-right">الحالة</th>

                  <th className="p-4 text-right">تاريخ الإغلاق</th>

                  <th className="p-4 text-right">الفاتورة</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b hover:bg-slate-50 transition"
                  >
                    <td className="p-4 font-medium">
                      {invoice.customerName || "عميل"}
                    </td>

                    <td className="p-4">{invoice.title}</td>

                    <td className="p-4 font-semibold">
                      {invoice.totalAmount.toLocaleString()} ج
                    </td>

                    <td className="p-4">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                        مكتملة السداد
                      </span>
                    </td>

                    <td className="p-4">
                      {new Date(invoice.updatedAt).toLocaleString("ar-EG", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="p-4">
                      <Link
                        href={`/finance/invoices/${invoice.id}`}
                        className="inline-flex items-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition"
                      >
                        عرض الفاتورة
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}