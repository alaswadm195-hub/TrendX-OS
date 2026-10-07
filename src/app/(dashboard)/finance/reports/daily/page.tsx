import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

import {
  ArrowRight,
  CalendarDays,
} from "lucide-react";

export const dynamic =
  "force-dynamic";

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

function toCents(
  value: MoneyValue,
) {
  const numericValue =
    moneyToNumber(value);

  const cents =
    Math.round(
      numericValue * 100,
    );

  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      "Monetary value is out of range",
    );
  }

  return cents;
}

function fromCents(
  cents: number,
) {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      "Monetary total is out of range",
    );
  }

  return cents / 100;
}

export default async function DailyReportPage() {
  await requireAdmin();

  const now = new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

  const endOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

  const [
    rawInvoices,
    rawExpenses,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
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
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: startOfToday,
          lt: endOfToday,
        },
      },

      select: {
        id: true,
        title: true,
        amount: true,
        notes: true,
        expenseDate: true,
      },

      orderBy: {
        expenseDate: "desc",
      },
    }),
  ]);

  /*
   * Normalize Prisma Float / future Prisma.Decimal values into plain
   * JavaScript numbers before rendering them in React.
   */
  const invoices =
    rawInvoices.map(
      (invoice) => ({
        ...invoice,

        totalAmount:
          moneyToNumber(
            invoice.totalAmount,
          ),

        paidAmount:
          moneyToNumber(
            invoice.paidAmount,
          ),

        remainingAmount:
          moneyToNumber(
            invoice.remainingAmount,
          ),
      }),
    );

  const expenses =
    rawExpenses.map(
      (expense) => ({
        ...expense,

        amount:
          moneyToNumber(
            expense.amount,
          ),
      }),
    );

  /*
   * All report aggregation is done in integer cents.
   * This avoids floating-point accumulation errors now and remains valid
   * after monetary columns are migrated to Decimal(14, 2).
   */
  const totalSalesCents =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        toCents(
          invoice.totalAmount,
        ),
      0,
    );

  const totalPaidCents =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        toCents(
          invoice.paidAmount,
        ),
      0,
    );

  const totalRemainingCents =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        toCents(
          invoice.remainingAmount,
        ),
      0,
    );

  const totalExpensesCents =
    expenses.reduce(
      (sum, expense) =>
        sum +
        toCents(
          expense.amount,
        ),
      0,
    );

  const netCents =
    totalPaidCents -
    totalExpensesCents;

  const totalSales =
    fromCents(
      totalSalesCents,
    );

  const totalPaid =
    fromCents(
      totalPaidCents,
    );

  const totalRemaining =
    fromCents(
      totalRemainingCents,
    );

  const totalExpenses =
    fromCents(
      totalExpensesCents,
    );

  const net =
    fromCents(
      netCents,
    );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/finance/reports"
              className="p-2 rounded-xl border bg-white hover:bg-slate-50"
            >
              <ArrowRight
                size={20}
              />
            </Link>

            <h1 className="text-3xl font-bold">
              مبيعات اليوم
            </h1>
          </div>

          <p className="text-slate-500">
            جميع الفواتير والمصروفات المسجلة اليوم
          </p>
        </div>

        <div className="bg-white border rounded-2xl px-5 py-3 flex items-center gap-3">
          <CalendarDays
            size={20}
            className="text-emerald-600"
          />

          <span className="font-medium">
            {now.toLocaleDateString(
              "ar-EG",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid xl:grid-cols-5 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            عدد الفواتير
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {invoices.length}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            إجمالي المبيعات
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {totalSales.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            المدفوع
          </p>

          <h3 className="text-3xl font-bold mt-2 text-blue-600">
            {totalPaid.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            المصروفات
          </p>

          <h3 className="text-3xl font-bold mt-2 text-red-600">
            {totalExpenses.toLocaleString()} ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <p className="text-slate-500">
            صافي اليوم
          </p>

          <h3 className="text-3xl font-bold mt-2 text-purple-600">
            {net.toLocaleString()} ج
          </h3>
        </div>
      </div>

      {/* Remaining */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-8">
        <p className="text-sm text-orange-700">
          إجمالي المتبقي على الفواتير
        </p>

        <h3 className="text-2xl font-bold text-orange-700 mt-1">
          {totalRemaining.toLocaleString()} ج
        </h3>
      </div>

      {/* Invoices */}
      <div className="bg-white border rounded-2xl overflow-hidden mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            فواتير اليوم
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {invoices.length} فاتورة
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا توجد فواتير اليوم
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
                    الهاتف
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

                  <th className="text-right p-4">
                    التفاصيل
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
                      <td className="p-4 font-medium">
                        {invoice.customerName ||
                          "عميل"}
                      </td>

                      <td className="p-4 text-slate-500">
                        {invoice.customerPhone ||
                          "-"}
                      </td>

                      <td className="p-4">
                        {
                          invoice.title
                        }
                      </td>

                      <td className="p-4 font-medium">
                        {invoice.totalAmount.toLocaleString()}{" "}
                        ج
                      </td>

                      <td className="p-4 text-green-600">
                        {invoice.paidAmount.toLocaleString()}{" "}
                        ج
                      </td>

                      <td className="p-4 text-orange-500">
                        {invoice.remainingAmount.toLocaleString()}{" "}
                        ج
                      </td>

                      <td className="p-4">
                        {invoice.status ===
                        "PAID" ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                            مدفوعة
                          </span>
                        ) : invoice.status ===
                          "PARTIAL" ? (
                          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                            جزئيًا
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                            غير مدفوعة
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/finance/invoices/${invoice.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          التفاصيل
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            مصروفات اليوم
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {expenses.length} مصروف
          </p>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا توجد مصروفات اليوم
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

                  <th className="text-right p-4">
                    الوقت
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
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4 font-medium">
                        {
                          expense.title
                        }
                      </td>

                      <td className="p-4 text-red-600 font-medium">
                        {expense.amount.toLocaleString()}{" "}
                        ج
                      </td>

                      <td className="p-4 text-slate-500">
                        {expense.notes ||
                          "-"}
                      </td>

                      <td className="p-4 text-slate-500">
                        {expense.expenseDate.toLocaleTimeString(
                          "ar-EG",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
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
