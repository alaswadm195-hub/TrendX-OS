import Link from "next/link";
import { connection } from "next/server";

import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

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

export default async function InvoiceArchivePage() {
  await requireAdmin();
  await connection();

  const rawInvoices =
    await prisma.invoice.findMany({
      where: {
        status: "PAID",
      },

      select: {
        id: true,
        customerName: true,
        title: true,
        totalAmount: true,
        paidAmount: true,
        paidAt: true,
        updatedAt: true,
      },

      orderBy: [
        {
          paidAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
    });

  /*
   * Normalize current Float values and future Prisma.Decimal values before
   * rendering them in React.
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

        closedAt:
          invoice.paidAt ??
          invoice.updatedAt,
      }),
    );

  const totalInvoices =
    invoices.length;

  /*
   * Financial aggregation is performed in integer cents so it remains safe
   * after the Float -> Decimal migration.
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

  const totalCollectedCents =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        toCents(
          invoice.paidAmount,
        ),
      0,
    );

  const totalSales =
    fromCents(
      totalSalesCents,
    );

  const totalCollected =
    fromCents(
      totalCollectedCents,
    );

  const lastClosedInvoice =
    invoices.length > 0
      ? invoices[0].closedAt
      : null;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          أرشيف الفواتير
        </h1>

        <p className="text-slate-500 mt-2">
          الفواتير المكتملة السداد فقط
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            عدد الفواتير
          </p>

          <h3 className="text-3xl font-bold mt-3">
            {totalInvoices}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي المبيعات
          </p>

          <h3 className="text-3xl font-bold mt-3 text-green-600">
            {totalSales.toLocaleString(
              "ar-EG",
            )}{" "}
            ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي المتحصل
          </p>

          <h3 className="text-3xl font-bold mt-3 text-blue-600">
            {totalCollected.toLocaleString(
              "ar-EG",
            )}{" "}
            ج
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            آخر عملية سداد
          </p>

          <h3 className="text-sm font-semibold mt-3">
            {lastClosedInvoice
              ? lastClosedInvoice.toLocaleString(
                  "ar-EG",
                  {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )
              : "-"}
          </h3>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            الفواتير المكتملة
          </h2>
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
                  <th className="p-4 text-right">
                    العميل
                  </th>

                  <th className="p-4 text-right">
                    الخدمة
                  </th>

                  <th className="p-4 text-right">
                    الإجمالي
                  </th>

                  <th className="p-4 text-right">
                    الحالة
                  </th>

                  <th className="p-4 text-right">
                    تاريخ الإغلاق
                  </th>

                  <th className="p-4 text-right">
                    الفاتورة
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
                      className="border-b hover:bg-slate-50 transition"
                    >
                      <td className="p-4 font-medium">
                        {invoice.customerName ||
                          "عميل"}
                      </td>

                      <td className="p-4">
                        {
                          invoice.title
                        }
                      </td>

                      <td className="p-4 font-semibold">
                        {invoice.totalAmount.toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ج
                      </td>

                      <td className="p-4">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                          مكتملة السداد
                        </span>
                      </td>

                      <td className="p-4">
                        {invoice.closedAt.toLocaleString(
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

                      <td className="p-4">
                        <Link
                          href={`/finance/invoices/${invoice.id}`}
                          className="inline-flex items-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition"
                        >
                          عرض الفاتورة
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
    </div>
  );
}
