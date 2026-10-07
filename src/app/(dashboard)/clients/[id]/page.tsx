import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  formatMoney,
  moneyToCents,
  paymentMethodLabels,
} from "@/lib/finance";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type StatementRow = {
  id: string;
  date: Date;
  description: string;
  type:
    | "CHARGE"
    | "PAYMENT";
  amountCents: number;
  note?: string;
};

function formatDate(
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
    },
  ).format(date);
}

export default async function ClientStatementPage({
  params,
}: Props) {
  const user =
    await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.role !== "ADMIN"
  ) {
    redirect("/tasks");
  }

  const { id } =
    await params;

  const client =
    await prisma.client.findUnique(
      {
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          email: true,
          archivedAt: true,

          subscriptions: {
            orderBy: {
              createdAt:
                "asc",
            },
            select: {
              id: true,
              planName: true,
              totalAmount: true,
              remainingAmount:
                true,
              status: true,
              createdAt: true,
              payments: {
                orderBy: {
                  paymentDate:
                    "asc",
                },
                select: {
                  id: true,
                  amount: true,
                  paymentDate:
                    true,
                  paymentMethod:
                    true,
                  referenceNumber:
                    true,
                },
              },
            },
          },

          invoices: {
            orderBy: {
              createdAt:
                "asc",
            },
            select: {
              id: true,
              title: true,
              totalAmount: true,
              remainingAmount:
                true,
              status: true,
              createdAt: true,
              payments: {
                orderBy: {
                  paymentDate:
                    "asc",
                },
                select: {
                  id: true,
                  amount: true,
                  paymentDate:
                    true,
                  paymentMethod:
                    true,
                  referenceNumber:
                    true,
                },
              },
            },
          },
        },
      },
    );

  if (!client) {
    notFound();
  }

  let totalSalesCents = 0;
  let totalPaidCents = 0;
  let receivablesCents = 0;

  const rows:
    StatementRow[] = [];

  for (const subscription of
    client.subscriptions) {
    if (
      subscription.status !==
      "CANCELLED"
    ) {
      totalSalesCents +=
        moneyToCents(
          subscription.totalAmount,
        );

      receivablesCents +=
        moneyToCents(
          subscription.remainingAmount,
        );

      rows.push({
        id: `sub-charge-${subscription.id}`,
        date:
          subscription.createdAt,
        description: `اشتراك: ${subscription.planName}`,
        type: "CHARGE",
        amountCents:
          moneyToCents(
            subscription.totalAmount,
          ),
      });
    }

    for (const payment of
      subscription.payments) {
      const amountCents =
        moneyToCents(
          payment.amount,
        );

      totalPaidCents +=
        amountCents;

      rows.push({
        id: `sub-payment-${payment.id}`,
        date:
          payment.paymentDate,
        description: `دفعة اشتراك: ${subscription.planName}`,
        type: "PAYMENT",
        amountCents,
        note: `${
          paymentMethodLabels[
            payment
              .paymentMethod
          ]
        }${
          payment.referenceNumber
            ? ` • ${payment.referenceNumber}`
            : ""
        }`,
      });
    }
  }

  for (const invoice of
    client.invoices) {
    if (
      invoice.status !==
      "CANCELLED"
    ) {
      totalSalesCents +=
        moneyToCents(
          invoice.totalAmount,
        );

      receivablesCents +=
        moneyToCents(
          invoice.remainingAmount,
        );

      rows.push({
        id: `inv-charge-${invoice.id}`,
        date:
          invoice.createdAt,
        description: `فاتورة: ${invoice.title}`,
        type: "CHARGE",
        amountCents:
          moneyToCents(
            invoice.totalAmount,
          ),
      });
    }

    for (const payment of
      invoice.payments) {
      const amountCents =
        moneyToCents(
          payment.amount,
        );

      totalPaidCents +=
        amountCents;

      rows.push({
        id: `inv-payment-${payment.id}`,
        date:
          payment.paymentDate,
        description: `دفعة فاتورة: ${invoice.title}`,
        type: "PAYMENT",
        amountCents,
        note: `${
          paymentMethodLabels[
            payment
              .paymentMethod
          ]
        }${
          payment.referenceNumber
            ? ` • ${payment.referenceNumber}`
            : ""
        }`,
      });
    }
  }

  rows.sort(
    (a, b) =>
      a.date.getTime() -
      b.date.getTime(),
  );

  return (
    <div
      dir="rtl"
      className="p-4 md:p-6 lg:p-8"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/clients/${client.id}`}
            className="text-sm font-bold text-[#123b69] hover:underline"
          >
            ← رجوع للعميل
          </Link>

          <h1 className="mt-3 text-3xl font-black text-[#102f55]">
            كشف حساب{" "}
            {client.name}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {client.company ||
              "عميل TrendX"}
            {client.archivedAt
              ? " • مؤرشف"
              : ""}
          </p>
        </div>

        <Link
          href="/finance"
          className="rounded-xl border bg-white px-4 py-3 text-sm font-bold text-[#17385f]"
        >
          المالية
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Metric
          label="إجمالي التعاملات"
          value={formatMoney(
            totalSalesCents,
          )}
        />

        <Metric
          label="إجمالي المدفوع"
          value={formatMoney(
            totalPaidCents,
          )}
        />

        <Metric
          label="المستحق الحالي"
          value={formatMoney(
            receivablesCents,
          )}
        />
      </div>

      <section className="mt-8 overflow-hidden rounded-[24px] border border-[#e5ebf2] bg-white">
        <div className="border-b p-5 md:p-6">
          <h2 className="text-xl font-black text-[#102f55]">
            حركة الحساب
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            كل الفواتير،
            الاشتراكات والمدفوعات
            بترتيب التاريخ
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">
            لا توجد حركة على
            الحساب حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b bg-[#fafbfd] text-xs text-slate-500">
                  <th className="p-4 text-right">
                    التاريخ
                  </th>
                  <th className="p-4 text-right">
                    البيان
                  </th>
                  <th className="p-4 text-right">
                    عليه
                  </th>
                  <th className="p-4 text-right">
                    دفع
                  </th>
                  <th className="p-4 text-right">
                    التفاصيل
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(
                          row.date,
                        )}
                      </td>

                      <td className="p-4 font-bold text-[#17385f]">
                        {
                          row.description
                        }
                      </td>

                      <td className="p-4 font-bold text-amber-600">
                        {row.type ===
                        "CHARGE"
                          ? formatMoney(
                              row.amountCents,
                            )
                          : "—"}
                      </td>

                      <td className="p-4 font-bold text-emerald-600">
                        {row.type ===
                        "PAYMENT"
                          ? formatMoney(
                              row.amountCents,
                            )
                          : "—"}
                      </td>

                      <td className="p-4 text-xs text-slate-500">
                        {row.note ||
                          "—"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 rounded-2xl border border-[#f1ddc6] bg-[#fffaf4] p-4 text-sm font-medium text-[#87511d]">
        المستحق الحالي يُحسب من
        الأرصدة المتبقية للفواتير
        والاشتراكات غير الملغاة.
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#e5ebf2] bg-white p-5">
      <p className="text-sm font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-black text-[#102f55]">
        {value}
      </p>
    </div>
  );
}
