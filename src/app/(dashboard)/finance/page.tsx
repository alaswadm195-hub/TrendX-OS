import Link from "next/link";
import { redirect } from "next/navigation";

import AddInvoiceModal from "@/components/finance/AddInvoiceModal";
import AddExpenseModal from "@/components/finance/AddExpenseModal";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  expenseCategoryLabels,
  formatMoney,
  getFinanceSnapshot,
  getPaymentMethodBreakdown,
  getRecentTreasuryMovements,
  moneyToCents,
  paymentMethodLabels,
} from "@/lib/finance";

type FinancePageProps = {
  searchParams: Promise<{
    invoiceStatus?: string;
  }>;
};

function formatDateTime(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      timeZone:
        "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default async function FinancePage({
  searchParams,
}: FinancePageProps) {
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

  const params =
    await searchParams;

  const invoiceStatus =
    params.invoiceStatus ===
      "PAID" ||
    params.invoiceStatus ===
      "OPEN" ||
    params.invoiceStatus ===
      "CANCELLED"
      ? params.invoiceStatus
      : "ALL";

  const [
    snapshot,
    movements,
    paymentMethods,
    invoices,
    expenses,
  ] = await Promise.all([
    getFinanceSnapshot(),
    getRecentTreasuryMovements(
      20,
    ),
    getPaymentMethodBreakdown(),

    prisma.invoice.findMany({
      select: {
        id: true,
        clientId: true,
        customerName: true,
        title: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        createdAt: true,
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.expense.findMany({
      take: 30,
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        paymentMethod: true,
        referenceNumber: true,
        notes: true,
        expenseDate: true,
      },
      orderBy: {
        expenseDate: "desc",
      },
    }),
  ]);

  const filteredInvoices =
    invoiceStatus === "PAID"
      ? invoices.filter(
          (invoice) =>
            invoice.status ===
            "PAID",
        )
      : invoiceStatus === "OPEN"
        ? invoices.filter(
            (invoice) =>
              invoice.status ===
                "PENDING" ||
              invoice.status ===
                "PARTIAL",
          )
        : invoiceStatus ===
            "CANCELLED"
          ? invoices.filter(
              (invoice) =>
                invoice.status ===
                "CANCELLED",
            )
          : invoices;

  const cards = [
    {
      label:
        "إجمالي المبيعات",
      value:
        formatMoney(
          snapshot.salesCents,
        ),
      hint: `فواتير ${formatMoney(
        snapshot.invoiceSalesCents,
      )} • اشتراكات ${formatMoney(
        snapshot.subscriptionSalesCents,
      )}`,
      className:
        "text-emerald-700",
    },
    {
      label: "المتحصل",
      value:
        formatMoney(
          snapshot.collectionsCents,
        ),
      hint: "فلوس دخلت فعليًا",
      className:
        "text-[#123b69]",
    },
    {
      label:
        "مستحقات العملاء",
      value:
        formatMoney(
          snapshot.receivablesCents,
        ),
      hint: "المبالغ المتبقية للتحصيل",
      className:
        "text-amber-600",
    },
    {
      label: "المصروفات",
      value:
        formatMoney(
          snapshot.expensesCents,
        ),
      hint: "إجمالي المصروفات المسجلة",
      className:
        "text-red-600",
    },
    {
      label: "رصيد الخزنة",
      value:
        formatMoney(
          snapshot.cashBalanceCents,
        ),
      hint:
        "المتحصل − المصروفات",
      className:
        snapshot.cashBalanceCents >=
        0
          ? "text-blue-700"
          : "text-red-700",
    },
    {
      label:
        "الفواتير المفتوحة",
      value:
        snapshot.openInvoiceCount.toLocaleString(
          "ar-EG",
        ),
      hint:
        "غير المدفوعة + الجزئية",
      className:
        "text-violet-700",
    },
  ];

  return (
    <div
      dir="rtl"
      className="p-4 md:p-6 lg:p-8"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#f28a32]">
            Finance Center
          </p>

          <h1 className="mt-1 text-3xl font-black text-[#102f55]">
            المالية
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-500">
            المبيعات، التحصيلات،
            المستحقات وحركة الخزنة
            في مكان واحد
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <AddExpenseModal />
          <AddInvoiceModal />

          <Link
            href="/finance/reports"
            className="rounded-2xl border border-[#dfe6ef] bg-white px-4 py-3 text-sm font-bold text-[#17385f] shadow-sm transition hover:bg-slate-50"
          >
            التقارير
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map(
          (card) => (
            <div
              key={card.label}
              className="rounded-[22px] border border-[#e4eaf1] bg-white p-5 shadow-[0_8px_24px_rgba(15,47,85,0.05)]"
            >
              <p className="text-sm font-bold text-slate-500">
                {card.label}
              </p>

              <h3
                className={`mt-3 text-2xl font-black ${card.className}`}
              >
                {card.value}
              </h3>

              <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
                {card.hint}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="overflow-hidden rounded-[24px] border border-[#e4eaf1] bg-white shadow-[0_8px_24px_rgba(15,47,85,0.05)] xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f5] p-5 md:p-6">
            <div>
              <h2 className="text-xl font-black text-[#102f55]">
                سجل حركة الخزنة
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                آخر التحصيلات
                والمصروفات بترتيب
                زمني
              </p>
            </div>

            <span className="rounded-full bg-[#f5f8fc] px-3 py-1 text-xs font-bold text-[#17385f]">
              آخر{" "}
              {movements.length.toLocaleString(
                "ar-EG",
              )}{" "}
              حركة
            </span>
          </div>

          {movements.length ===
          0 ? (
            <div className="py-14 text-center text-sm text-slate-500">
              لا توجد حركة مالية حتى
              الآن
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#edf1f5] bg-[#fafbfd] text-xs text-slate-500">
                    <th className="p-4 text-right">
                      التاريخ
                    </th>
                    <th className="p-4 text-right">
                      البيان
                    </th>
                    <th className="p-4 text-right">
                      الطرف
                    </th>
                    <th className="p-4 text-right">
                      الطريقة
                    </th>
                    <th className="p-4 text-right">
                      المرجع
                    </th>
                    <th className="p-4 text-right">
                      المبلغ
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movements.map(
                    (movement) => (
                      <tr
                        key={
                          movement.id
                        }
                        className="border-b border-[#f0f3f6] last:border-0"
                      >
                        <td className="whitespace-nowrap p-4 text-xs text-slate-500">
                          {formatDateTime(
                            movement.date,
                          )}
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-[#17385f]">
                            {
                              movement.title
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {movement.kind ===
                            "INVOICE_PAYMENT"
                              ? "دفعة فاتورة"
                              : movement.kind ===
                                  "SUBSCRIPTION_PAYMENT"
                                ? "دفعة اشتراك"
                                : "مصروف"}
                          </p>
                        </td>

                        <td className="p-4 text-sm text-slate-600">
                          {
                            movement.party
                          }
                        </td>

                        <td className="p-4 text-sm font-semibold text-slate-600">
                          {
                            paymentMethodLabels[
                              movement
                                .paymentMethod
                            ]
                          }
                        </td>

                        <td className="p-4 text-xs text-slate-500">
                          {movement.referenceNumber ||
                            "—"}
                        </td>

                        <td
                          className={`p-4 font-black ${
                            movement.direction ===
                            "IN"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.direction ===
                          "IN"
                            ? "+"
                            : "-"}
                          {formatMoney(
                            movement.amountCents,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-[#e4eaf1] bg-white p-5 shadow-[0_8px_24px_rgba(15,47,85,0.05)] md:p-6">
          <h2 className="text-xl font-black text-[#102f55]">
            التحصيل حسب طريقة
            الدفع
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            توزيع كل الفلوس
            المستلمة فعليًا
          </p>

          <div className="mt-6 space-y-3">
            {paymentMethods.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                لا توجد تحصيلات
                مسجلة
              </div>
            ) : (
              paymentMethods.map(
                (item) => (
                  <div
                    key={
                      item.paymentMethod
                    }
                    className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8fafc] px-4 py-3"
                  >
                    <span className="text-sm font-bold text-[#17385f]">
                      {item.label}
                    </span>

                    <span className="font-black text-[#102f55]">
                      {formatMoney(
                        item.amountCents,
                      )}
                    </span>
                  </div>
                ),
              )
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-[#f1ddc6] bg-[#fffaf4] p-4 text-xs font-medium leading-6 text-[#87511d]">
            المبيعات ≠ الخزنة.
            الخزنة تتحرك فقط عند
            تسجيل دفعة فعلية أو
            مصروف فعلي.
          </div>
        </section>
      </div>

      <section className="mb-8 overflow-hidden rounded-[24px] border border-[#e4eaf1] bg-white shadow-[0_8px_24px_rgba(15,47,85,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf1f5] p-5 md:p-6">
          <div>
            <h2 className="text-xl font-black text-[#102f55]">
              الفواتير
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الإجمالي، المدفوع
              والمتبقي لكل فاتورة
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {[
              ["ALL", "كل الفواتير"],
              ["OPEN", "غير مكتملة"],
              ["PAID", "مدفوعة"],
              [
                "CANCELLED",
                "ملغاة",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <Link
                  key={value}
                  href={
                    value ===
                    "ALL"
                      ? "/finance"
                      : `/finance?invoiceStatus=${value}`
                  }
                  className={`rounded-xl px-3 py-2 transition ${
                    invoiceStatus ===
                    value
                      ? "bg-[#123b69] text-white"
                      : "bg-[#f5f8fc] text-[#17385f] hover:bg-[#edf3f9]"
                  }`}
                >
                  {label}
                </Link>
              ),
            )}
          </div>
        </div>

        {filteredInvoices.length ===
        0 ? (
          <div className="py-14 text-center text-sm text-slate-500">
            لا توجد فواتير في هذا
            التصنيف
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-[#edf1f5] bg-[#fafbfd] text-xs text-slate-500">
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
                    المدفوع
                  </th>
                  <th className="p-4 text-right">
                    المتبقي
                  </th>
                  <th className="p-4 text-right">
                    الحالة
                  </th>
                  <th className="p-4 text-right">
                    الإجراء
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map(
                  (invoice) => {
                    const customerName =
                      invoice.client
                        ?.name ||
                      invoice.customerName ||
                      "عميل";

                    return (
                      <tr
                        key={
                          invoice.id
                        }
                        className="border-b border-[#f0f3f6] last:border-0"
                      >
                        <td className="p-4 font-bold text-[#17385f]">
                          {invoice.clientId ? (
                            <Link
                              href={`/clients/${invoice.clientId}/statement`}
                              className="hover:underline"
                            >
                              {
                                customerName
                              }
                            </Link>
                          ) : (
                            customerName
                          )}
                        </td>

                        <td className="p-4 text-sm text-slate-600">
                          {
                            invoice.title
                          }
                        </td>

                        <td className="p-4 font-bold text-[#102f55]">
                          {formatMoney(
                            moneyToCents(
                              invoice.totalAmount,
                            ),
                          )}
                        </td>

                        <td className="p-4 font-bold text-emerald-600">
                          {formatMoney(
                            moneyToCents(
                              invoice.paidAmount,
                            ),
                          )}
                        </td>

                        <td className="p-4 font-bold text-amber-600">
                          {formatMoney(
                            moneyToCents(
                              invoice.remainingAmount,
                            ),
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              invoice.status ===
                              "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : invoice.status ===
                                    "PARTIAL"
                                  ? "bg-amber-50 text-amber-700"
                                  : invoice.status ===
                                      "CANCELLED"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {invoice.status ===
                            "PAID"
                              ? "مدفوعة"
                              : invoice.status ===
                                  "PARTIAL"
                                ? "جزئية"
                                : invoice.status ===
                                    "CANCELLED"
                                  ? "ملغاة"
                                  : "غير مدفوعة"}
                          </span>
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/finance/invoices/${invoice.id}`}
                            className="text-sm font-bold text-[#123b69] hover:underline"
                          >
                            التفاصيل
                          </Link>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#e4eaf1] bg-white shadow-[0_8px_24px_rgba(15,47,85,0.05)]">
        <div className="border-b border-[#edf1f5] p-5 md:p-6">
          <h2 className="text-xl font-black text-[#102f55]">
            آخر المصروفات
          </h2>
        </div>

        {expenses.length ===
        0 ? (
          <div className="py-14 text-center text-sm text-slate-500">
            لا توجد مصروفات
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-[#edf1f5] bg-[#fafbfd] text-xs text-slate-500">
                  <th className="p-4 text-right">
                    التاريخ
                  </th>
                  <th className="p-4 text-right">
                    المصروف
                  </th>
                  <th className="p-4 text-right">
                    التصنيف
                  </th>
                  <th className="p-4 text-right">
                    الطريقة
                  </th>
                  <th className="p-4 text-right">
                    المرجع
                  </th>
                  <th className="p-4 text-right">
                    المبلغ
                  </th>
                </tr>
              </thead>

              <tbody>
                {expenses.map(
                  (expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-[#f0f3f6] last:border-0"
                    >
                      <td className="whitespace-nowrap p-4 text-xs text-slate-500">
                        {formatDateTime(
                          expense.expenseDate,
                        )}
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-[#17385f]">
                          {
                            expense.title
                          }
                        </p>
                        {expense.notes && (
                          <p className="mt-1 text-xs text-slate-400">
                            {
                              expense.notes
                            }
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-sm text-slate-600">
                        {
                          expenseCategoryLabels[
                            expense
                              .category
                          ]
                        }
                      </td>

                      <td className="p-4 text-sm text-slate-600">
                        {
                          paymentMethodLabels[
                            expense
                              .paymentMethod
                          ]
                        }
                      </td>

                      <td className="p-4 text-xs text-slate-500">
                        {expense.referenceNumber ||
                          "—"}
                      </td>

                      <td className="p-4 font-black text-red-600">
                        -
                        {formatMoney(
                          moneyToCents(
                            expense.amount,
                          ),
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 rounded-2xl border border-[#f1ddc6] bg-[#fffaf4] p-4 text-sm font-medium leading-7 text-[#87511d]">
        قاعدة العمل: الاشتراكات
        للعقود والباقات المتكررة،
        والفواتير للخدمات المنفصلة.
        لا تسجل نفس عملية البيع
        كاشتراك وفاتورة معًا حتى
        لا تتكرر في إجمالي
        المبيعات.
      </div>
    </div>
  );
}
