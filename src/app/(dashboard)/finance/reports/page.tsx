import { prisma } from "@/lib/prisma";

export default async function FinanceReportsPage() {
  const invoices =
    await prisma.invoice.findMany({
      where: {
        status: "PAID",
      },
      orderBy: {
        paidAt: "desc",
      },
    });

  const expenses =
    await prisma.expense.findMany();

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfWeek = new Date(now);
  startOfWeek.setDate(
    now.getDate() - now.getDay()
  );
  startOfWeek.setHours(
    0,
    0,
    0,
    0
  );

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const todayInvoices =
    invoices.filter(
      (invoice) =>
        invoice.paidAt &&
        new Date(invoice.paidAt) >=
          startOfToday
    );

  const weekInvoices =
    invoices.filter(
      (invoice) =>
        invoice.paidAt &&
        new Date(invoice.paidAt) >=
          startOfWeek
    );

  const monthInvoices =
    invoices.filter(
      (invoice) =>
        invoice.paidAt &&
        new Date(invoice.paidAt) >=
          startOfMonth
    );

  const totalInvoices =
    invoices.length;

  const totalSales =
    invoices.reduce(
      (sum, invoice) =>
        sum + invoice.totalAmount,
      0
    );

  const totalCollected =
    invoices.reduce(
      (sum, invoice) =>
        sum + invoice.paidAmount,
      0
    );

  const totalExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum + expense.amount,
      0
    );

  const netProfit =
    totalCollected -
    totalExpenses;

  const todaySales =
    todayInvoices.reduce(
      (sum, invoice) =>
        sum + invoice.totalAmount,
      0
    );

  const weekSales =
    weekInvoices.reduce(
      (sum, invoice) =>
        sum + invoice.totalAmount,
      0
    );

  const monthSales =
    monthInvoices.reduce(
      (sum, invoice) =>
        sum + invoice.totalAmount,
      0
    );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          الجرد والتقارير
        </h1>

        <p className="text-slate-500 mt-2">
          ملخص الأداء المالي
        </p>
      </div>

      <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي الفواتير
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {totalInvoices}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي المبيعات
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {totalSales.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي المصروفات
          </p>

          <h3 className="text-3xl font-bold mt-2 text-red-600">
            {totalExpenses.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            صافي الربح
          </p>

          <h3 className="text-3xl font-bold mt-2 text-purple-600">
            {netProfit.toLocaleString()} ج
          </h3>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            مبيعات اليوم
          </p>

          <h3 className="text-3xl font-bold mt-2 text-emerald-600">
            {todaySales.toLocaleString()} ج
          </h3>

          <p className="mt-3 text-sm text-slate-500">
            عدد الفواتير:
            {" "}
            {todayInvoices.length}
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            مبيعات الأسبوع
          </p>

          <h3 className="text-3xl font-bold mt-2 text-blue-600">
            {weekSales.toLocaleString()} ج
          </h3>

          <p className="mt-3 text-sm text-slate-500">
            عدد الفواتير:
            {" "}
            {weekInvoices.length}
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            مبيعات الشهر
          </p>

          <h3 className="text-3xl font-bold mt-2 text-orange-600">
            {monthSales.toLocaleString()} ج
          </h3>

          <p className="mt-3 text-sm text-slate-500">
            عدد الفواتير:
            {" "}
            {monthInvoices.length}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            آخر الفواتير المكتملة
          </h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            لا توجد فواتير مكتملة
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
                    تاريخ السداد
                  </th>
                </tr>
              </thead>

              <tbody>
                {invoices.map(
                  (invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        {invoice.customerName ||
                          "عميل"}
                      </td>

                      <td className="p-4">
                        {invoice.title}
                      </td>

                      <td className="p-4 font-medium">
                        {invoice.totalAmount.toLocaleString()} ج
                      </td>

                      <td className="p-4">
                        {invoice.paidAt
                          ? new Date(
                              invoice.paidAt
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
                            )
                          : "-"}
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