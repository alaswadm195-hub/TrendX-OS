"use client";

import {
  useState,
} from "react";
import {
  Plus,
  X,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

const paymentMethods = [
  ["CASH", "كاش"],
  ["INSTAPAY", "InstaPay"],
  [
    "BANK_TRANSFER",
    "تحويل بنكي",
  ],
  [
    "VODAFONE_CASH",
    "Vodafone Cash",
  ],
  ["OTHER", "أخرى"],
] as const;

const categories = [
  ["SALARIES", "رواتب"],
  ["RENT", "إيجار"],
  ["ADS", "إعلانات"],
  ["EQUIPMENT", "معدات"],
  [
    "TRANSPORT",
    "مواصلات",
  ],
  [
    "PURCHASES",
    "مشتريات",
  ],
  ["OTHER", "أخرى"],
] as const;

export default function AddExpenseModal() {
  const router =
    useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      title: "",
      amount: "",
      category: "OTHER",
      paymentMethod:
        "OTHER",
      referenceNumber: "",
      notes: "",
      expenseDate: "",
    });

  function close() {
    if (loading) return;

    setOpen(false);
    setError("");
  }

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const amount =
        Number(form.amount);

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        setError(
          "اكتب مبلغ صحيح أكبر من صفر",
        );
        return;
      }

      const response =
        await fetch(
          "/api/expenses",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                title:
                  form.title,
                amount,
                category:
                  form.category,
                paymentMethod:
                  form.paymentMethod,
                referenceNumber:
                  form.referenceNumber ||
                  null,
                notes:
                  form.notes ||
                  null,
                expenseDate:
                  form.expenseDate
                    ? new Date(
                        form.expenseDate,
                      ).toISOString()
                    : undefined,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "تعذر تسجيل المصروف",
        );
      }

      setForm({
        title: "",
        amount: "",
        category:
          "OTHER",
        paymentMethod:
          "OTHER",
        referenceNumber: "",
        notes: "",
        expenseDate: "",
      });

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تسجيل المصروف",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
      >
        <Plus size={18} />
        مصروف جديد
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            dir="rtl"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-black text-[#102f55]">
                  تسجيل مصروف
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  سجل طريقة الدفع
                  والتصنيف عشان
                  الجرد يطلع مظبوط
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={submit}
              className="space-y-5 p-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    اسم المصروف
                  </span>

                  <input
                    required
                    value={
                      form.title
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        {
                          ...form,
                          title:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f28a32]"
                    placeholder="مثال: إيجار الاستوديو"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    المبلغ
                  </span>

                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={
                      form.amount
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        {
                          ...form,
                          amount:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f28a32]"
                    placeholder="0.00"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    التصنيف
                  </span>

                  <select
                    value={
                      form.category
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        {
                          ...form,
                          category:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f28a32]"
                  >
                    {categories.map(
                      ([
                        value,
                        label,
                      ]) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    طريقة الدفع
                  </span>

                  <select
                    value={
                      form.paymentMethod
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        {
                          ...form,
                          paymentMethod:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f28a32]"
                  >
                    {paymentMethods.map(
                      ([
                        value,
                        label,
                      ]) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    رقم مرجعي
                  </span>

                  <input
                    maxLength={160}
                    value={
                      form.referenceNumber
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        {
                          ...form,
                          referenceNumber:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f28a32]"
                    placeholder="اختياري"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    التاريخ
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      form.expenseDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        {
                          ...form,
                          expenseDate:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f28a32]"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-[#17385f]">
                  ملاحظات
                </span>

                <textarea
                  rows={3}
                  value={
                    form.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      notes:
                        event
                          .target
                          .value,
                    })
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f28a32]"
                  placeholder="أي تفاصيل إضافية"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="flex-1 rounded-xl bg-[#123b69] px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  {loading
                    ? "جاري التسجيل..."
                    : "تسجيل المصروف"}
                </button>

                <button
                  type="button"
                  onClick={close}
                  disabled={
                    loading
                  }
                  className="rounded-xl border px-5 py-3 font-bold text-slate-600"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
