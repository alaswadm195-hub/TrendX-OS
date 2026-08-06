"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function AddExpenseModal() {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState({
      title: "",
      amount: "",
      notes: "",
    });

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !form.title ||
      !form.amount
    ) {
      alert(
        "اكمل البيانات المطلوبة"
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/expenses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: form.title,
            amount:
              form.amount,
            notes:
              form.notes,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setForm({
        title: "",
        amount: "",
        notes: "",
      });

      setOpen(false);

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء الحفظ"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() =>
          setOpen(true)
        }
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl"
      >
        <Plus size={18} />
        مصروف جديد
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                إضافة مصروف
              </h2>

              <button
                onClick={() =>
                  setOpen(false)
                }
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4"
            >
              <input
                placeholder="اسم المصروف"
                value={
                  form.title
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    title:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                type="number"
                placeholder="المبلغ"
                value={
                  form.amount
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <textarea
                placeholder="ملاحظات"
                value={
                  form.notes
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3 h-28"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3"
              >
                {loading
                  ? "جارٍ الحفظ..."
                  : "حفظ المصروف"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}