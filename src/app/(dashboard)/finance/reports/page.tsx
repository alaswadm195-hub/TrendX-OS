import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  FileText,
  CalendarDays,
  CalendarRange,
  Wallet,
  Receipt,
} from "lucide-react";

export default async function FinanceReportsPage() {
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

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6
  );

  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = endOfToday;

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  const todayInvoices =
    invoices.filter((invoice) => {
      const date = new Date(
        invoice.createdAt
      );

      return (
        date >= startOfToday &&
        date < endOfToday
      );
    });

  const weekInvoices =
    invoices.filter((invoice) => {
      const date = new Date(
        invoice.createdAt
      );

      return (
        date >= startOfWeek &&
        date < endOfWeek
      );
    });

  const monthInvoices =
    invoices.filter((invoice) => {
      const date = new Date(
        invoice.createdAt
      );

      return (
        date >= startOfMonth &&
        date < endOfMonth
      );
    });

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

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          الجرد والتقارير
        </h1>

        <p className="text-slate-500 mt-2">
          ملخص الأداء المالي والتقارير الزمنية
        </p>
      </div>

      {/* Overall Statistics */}
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

      {/* Reports */}
      <div className="grid xl:grid-cols-3 gap-6 mb-8">

        {/* Today */}
        <Link
          href="/finance/reports/daily"
          className="group bg-white border rounded-2xl p-6 hover:border-emerald-400 hover:shadow-md transition"
        >
          <div className="flex items-start justify-between">

            <div>
              <p className="text-slate-500">
                مبيعات اليوم
              </p>

              <h3 className="text-3xl font-bold mt-2 text-emerald-600">
                {todaySales.toLocaleString()} ج
              </h3>

              <p className="mt-3 text-sm text-slate-500">
                عدد الفواتير:{" "}
                {todayInvoices.length}
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-600 group-hover:underline">
                عرض تفاصيل اليوم ←
              </p>
            </div>

            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
              <CalendarDays size={24} />
            </div>

          </div>
        </Link>

        {/* Week */}
        <Link
          href="/finance/reports/weekly"
          className="group bg-white border rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition"
        >
          <div className="flex items-start justify-between">

            <div>
              <p className="text-slate-500">
                مبيعات الأسبوع
              </p>

              <h3 className="text-3xl font-bold mt-2 text-blue-600">
                {weekSales.toLocaleString()} ج
              </h3>

              <p className="mt-3 text-sm text-slate-500">
                آخر 7 أيام
              </p>

              <p className="text-sm text-slate-500 mt-1">
                عدد الفواتير:{" "}
                {weekInvoices.length}
              </p>

              <p className="mt-4 text-sm font-medium text-blue-600 group-hover:underline">
                عرض تفاصيل الأسبوع ←
              </p>
            </div>

            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
              <CalendarRange size={24} />
            </div>

          </div>
        </Link>

        {/* Month */}
        <Link
          href="/finance/reports/monthly"
          className="group bg-white border rounded-2xl p-6 hover:border-orange-400 hover:shadow-md transition"
        >
          <div className="flex items-start justify-between">

            <div>
              <p className="text-slate-500">
                مبيعات الشهر
              </p>

              <h3 className="text-3xl font-bold mt-2 text-orange-600">
                {monthSales.toLocaleString()} ج
              </h3>

              <p className="mt-3 text-sm text-slate-500">
                الشهر الحالي
              </p>

              <p className="text-sm text-slate-500 mt-1">
                عدد الفواتير:{" "}
                {monthInvoices.length}
              </p>

              <p className="mt-4 text-sm font-medium text-orange-600 group-hover:underline">
                اختيار شهر وعرض التفاصيل ←
              </p>
            </div>

            <div className="bg-orange-100 text-orange-600 p-3 rounded-xl">
              <CalendarRange size={24} />
            </div>

          </div>
        </Link>

      </div>

      {/* Quick Info */}
      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 text-green-600 p-2 rounded-xl">
              <Receipt size={20} />
            </div>

            <h2 className="font-bold">
              المقبوضات
            </h2>
          </div>

          <p className="text-2xl font-bold text-green-600">
            {totalCollected.toLocaleString()} ج
          </p>

          <p className="text-sm text-slate-500 mt-2">
            إجمالي المبالغ المحصلة من الفواتير
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <Wallet size={20} />
            </div>

            <h2 className="font-bold">
              المصروفات
            </h2>
          </div>

          <p className="text-2xl font-bold text-red-600">
            {totalExpenses.toLocaleString()} ج
          </p>

          <p className="text-sm text-slate-500 mt-2">
            إجمالي المصروفات المسجلة
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 text-purple-600 p-2 rounded-xl">
              <FileText size={20} />
            </div>

            <h2 className="font-bold">
              صافي الربح
            </h2>
          </div>

          <p className="text-2xl font-bold text-purple-600">
            {netProfit.toLocaleString()} ج
          </p>

          <p className="text-sm text-slate-500 mt-2">
            المقبوضات − المصروفات
          </p>
        </div>

      </div>

    </div>
  );
}