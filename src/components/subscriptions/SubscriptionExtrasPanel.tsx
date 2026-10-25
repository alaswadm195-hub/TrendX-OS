"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AddonInvoice = {
  id: string;
  title: string;
  description: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  createdAt: string;
};

type Props = {
  subscriptionId: string;
  planName: string;
  cancelled: boolean;
  invoices: AddonInvoice[];
};

const categories = [
  { value: "EXTRA_SHOOT", label: "تصوير إضافي" },
  { value: "URGENT_EDIT", label: "مونتاج مستعجل" },
  { value: "HOLIDAY_SHOOT", label: "تصوير الجمعة / يوم إجازة" },
  { value: "OTHER", label: "خدمة إضافية أخرى" },
];

const initialForm = {
  category: "EXTRA_SHOOT",
  description: "",
  totalAmount: "",
  paidAmount: "0",
  paymentMethod: "OTHER",
};

function currency(amount: number): string {
  return `${amount.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج`;
}

export default function SubscriptionExtrasPanel({
  subscriptionId,
  planName,
  cancelled,
  invoices,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visibleInvoices = invoices.filter((invoice) => invoice.status !== "CANCELLED");
  const sum = (field: "totalAmount" | "paidAmount" | "remainingAmount") =>
    visibleInvoices.reduce((total, invoice) => total + invoice[field], 0);

  async function addExtra(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || cancelled) return;
    setError("");

    const totalAmount = Number(form.totalAmount);
    const paidAmount = Number(form.paidAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 ||
        !Number.isFinite(paidAmount) || paidAmount < 0 ||
        paidAmount > totalAmount) {
      setError("اتأكد من إجمالي الإضافة والمدفوع؛ المدفوع مينفعش يتجاوز الإجمالي.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/subscriptions/${subscriptionId}/extras`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: form.category,
            description: form.description.trim() || null,
            totalAmount,
            paidAmount,
            paymentMethod: form.paymentMethod,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || result?.message || "فشل إضافة الخدمة");
      }
      setForm(initialForm);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الإضافة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-[24px] border border-[#e5ebf2] bg-white p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-[#102f55]">الخدمات الإضافية على الباقة</h2>
        <p className="mt-2 text-sm text-slate-500">
          خدمات خاصة بباقة {planName}: تصوير إضافي، مونتاج مستعجل أو تصوير يوم الإجازة.
          كل إضافة لها فاتورة ودفعة مستقلة، من غير تغيير ساعات الباقة الأساسية.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">إجمالي الإضافات</p>
          <p className="font-bold">{currency(sum("totalAmount"))}</p>
        </div>
        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-sm text-slate-500">المدفوع للإضافات</p>
          <p className="font-bold text-green-700">{currency(sum("paidAmount"))}</p>
        </div>
        <div className="rounded-xl bg-orange-50 p-4">
          <p className="text-sm text-slate-500">المتبقي للإضافات</p>
          <p className="font-bold text-orange-700">{currency(sum("remainingAmount"))}</p>
        </div>
      </div>

      {!cancelled && (
        <form onSubmit={addExtra} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>نوع الإضافة</span>
            <select className="w-full rounded-xl border p-3" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>تفاصيل التصوير أو المونتاج</span>
            <input className="w-full rounded-xl border p-3" maxLength={500}
              placeholder="مثال: تصوير ساعتين إضافيتين"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}/>
          </label>
          <label className="space-y-2 text-sm">
            <span>سعر الإضافة (جنيه)</span>
            <input className="w-full rounded-xl border p-3" required type="number" step="0.01" min="0.01"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}/>
          </label>
          <label className="space-y-2 text-sm">
            <span>المدفوع الآن (جنيه)</span>
            <input className="w-full rounded-xl border p-3" required type="number" step="0.01" min="0"
              value={form.paidAmount}
              onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}/>
          </label>
          <label className="space-y-2 text-sm">
            <span>طريقة الدفع</span>
            <select className="w-full rounded-xl border p-3" value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              <option value="OTHER">أخرى</option>
              <option value="CASH">كاش</option>
              <option value="INSTAPAY">InstaPay</option>
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="VODAFONE_CASH">فودافون كاش</option>
            </select>
          </label>
          <div className="flex items-end">
            <button disabled={saving} type="submit"
              className="w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-50">
              {saving ? "جاري التسجيل..." : "إضافة الخدمة والمبلغ"}
            </button>
          </div>
          {error && <p role="alert" className="md:col-span-2 text-sm text-red-600">{error}</p>}
        </form>
      )}

      {invoices.length === 0 ? (
        <p className="py-4 text-center text-slate-500">مفيش خدمات إضافية على الباقة لسه.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="p-3 text-right">الإضافة</th>
              <th className="p-3 text-right">السعر</th>
              <th className="p-3 text-right">المدفوع</th>
              <th className="p-3 text-right">المتبقي</th>
              <th className="p-3 text-right">الفاتورة</th>
            </tr></thead>
            <tbody>{invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b">
                <td className="p-3">
                  <div className="font-semibold">{invoice.title}</div>
                  <div className="text-slate-500">{invoice.description || "-"}</div>
                  {invoice.status === "CANCELLED" && <span className="text-red-600">ملغاة</span>}
                </td>
                <td className="p-3">{currency(invoice.totalAmount)}</td>
                <td className="p-3">{currency(invoice.paidAmount)}</td>
                <td className="p-3">{currency(invoice.remainingAmount)}</td>
                <td className="p-3">
                  <a href={`/finance/invoices/${invoice.id}`} className="font-semibold text-blue-600 underline">التفاصيل</a>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
