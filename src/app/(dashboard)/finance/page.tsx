import Link from "next/link";
import { redirect } from "next/navigation";
import AddInvoiceModal from "@/components/finance/AddInvoiceModal";
import AddExpenseModal from "@/components/finance/AddExpenseModal";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export default async function FinancePage() {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (
    currentUser.role !==
    "ADMIN"
  ) {
    redirect("/tasks");
  }

  const invoices =
    await prisma.invoice.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

  const expenses =
    await prisma.expense.findMany({
      orderBy: {
        expenseDate: "desc",
      },
    });

  const totalInvoices =
    invoices.length;

  const totalSales =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        invoice.totalAmount,
      0
    );

  const totalPaid =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        invoice.paidAmount,
      0
    );

  const totalRemaining =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        invoice.remainingAmount,
      0
    );

  const totalExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum + expense.amount,
      0
    );

  const cashBalance =
    totalPaid -
    totalExpenses;

  const openInvoices =
    invoices.filter(
      (invoice) =>
        invoice.status !==
        "PAID"
    ).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            المالية
          </h1>

          <p className="text-slate-500 mt-2">
            إدارة الفواتير
            والمبيعات
          </p>
        </div>

        <div className="flex gap-3">
          <AddExpenseModal />
          <AddInvoiceModal />
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            إجمالي الفواتير
          </p>

          <h3 className="text-3xl font-bold mt-3">
            {totalInvoices}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            إجمالي المبيعات
          </p>

          <h3 className="text-3xl font-bold mt-3 text-green-600">
            {totalSales.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المتحصل
          </p>

          <h3 className="text-3xl font-bold mt-3 text-green-700">
            {totalPaid.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            المصروفات
          </p>

          <h3 className="text-3xl font-bold mt-3 text-red-600">
            {totalExpenses.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500">
            رصيد الخزنة
          </p>

          <h3 className="text-3xl font-bold mt-3 text-blue-600">
            {cashBalance.toLocaleString()} ج
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            الفواتير
          </h2>
        </div>

        {invoices.length ===
        0 ? (
          <div className="text-center py-12 text-slate-500">
            لا توجد فواتير حتى
            الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-right p-4">
                    العميل
                  </th>

                  <th className="text-right p-4">
                    الخدمة
                  </th>

                  <th className="text-right p-4">
                    الإجمالي
                  </th>

                  <th className="text-right p-4">
                    المدفوع
                  </th>

                  <th className="text-right p-4">
                    المتبقي
                  </th>

                  <th className="text-right p-4">
                    الحالة
                  </th>
                </tr>
              </thead>

              <tbody>
                {invoices.map(
                  (invoice) => (
                    <tr
                      key={
                        invoice.id
                      }
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <Link
                          href={`/finance/invoices/${invoice.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {invoice.customerName ||
                            "عميل"}
                        </Link>
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/finance/invoices/${invoice.id}`}
                          className="hover:underline"
                        >
                          {
                            invoice.title
                          }
                        </Link>
                      </td>

                      <td className="p-4">
                        {
                          invoice.totalAmount
                        }{" "}
                        ج
                      </td>

                      <td className="p-4 text-green-600">
                        {
                          invoice.paidAmount
                        }{" "}
                        ج
                      </td>

                      <td className="p-4 text-orange-500">
                        {
                          invoice.remainingAmount
                        }{" "}
                        ج
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {invoice.status ===
                          "PAID" ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                              مدفوعة
                            </span>
                          ) : invoice.status ===
                            "PARTIAL" ? (
                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                              مدفوعة
                              جزئياً
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                              غير
                              مدفوعة
                            </span>
                          )}

                          <Link
                            href={`/finance/invoices/${invoice.id}`}
                            className="text-blue-600 text-sm hover:underline"
                          >
                            التفاصيل
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            المصروفات
          </h2>
        </div>

        {expenses.length ===
        0 ? (
          <div className="text-center py-12 text-slate-500">
            لا توجد مصروفات
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-right p-4">
                    المصروف
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
                {expenses.map(
                  (expense) => (
                    <tr
                      key={
                        expense.id
                      }
                      className="border-b"
                    >
                      <td className="p-4">
                        {
                          expense.title
                        }
                      </td>

                      <td className="p-4 text-red-600">
                        {
                          expense.amount
                        }{" "}
                        ج
                      </td>

                      <td className="p-4">
                        {expense.notes ||
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

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <p className="text-sm text-slate-500 mb-2">
          الفواتير
          المفتوحة
        </p>

        <h3 className="text-3xl font-bold text-blue-700">
          {openInvoices}
        </h3>
      </div>
    </div>
  );
}