"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  invoiceId: string;
};

export default function AddPaymentModal({
  invoiceId,
}: Props) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [amount, setAmount] =
    useState("");

  const [notes, setNotes] =
    useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const paymentAmount =
      Number(amount);

    if (
      !paymentAmount ||
      paymentAmount <= 0
    ) {
      alert(
        "أدخل مبلغ دفعة صحيح"
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `/api/invoices/${invoiceId}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount:
              paymentAmount,
            notes,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setAmount("");
      setNotes("");

      setOpen(false);

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء إضافة الدفعة"
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
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
      >
        + إضافة دفعة
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() =>
            setOpen(false)
          }
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2 className="text-xl font-bold mb-6">
              إضافة دفعة جديدة
            </h2>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4"
            >
              <div>
                <label className="block text-sm mb-2 text-slate-600">
                  قيمة الدفعة
                </label>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="مثال: 500"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-slate-600">
                  ملاحظات
                </label>

                <textarea
                  placeholder="أي ملاحظات خاصة بالدفعة"
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-xl p-3 h-24 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl disabled:opacity-50"
                >
                  {loading
                    ? "جارٍ الحفظ..."
                    : "حفظ الدفعة"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  disabled={
                    loading
                  }
                  className="flex-1 border rounded-xl"
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