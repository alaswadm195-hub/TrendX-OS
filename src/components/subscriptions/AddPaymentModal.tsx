"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function AddPaymentModal({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
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

    if (!amount) {
      alert("ادخل قيمة الدفعة");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/payments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            subscriptionId,
            amount: Number(amount),
            notes,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setOpen(false);
      setAmount("");
      setNotes("");

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحفظ");
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
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
      >
        <Plus size={18} />
        إضافة دفعة
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                إضافة دفعة
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
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <input
                type="number"
                placeholder="قيمة الدفعة"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                className="w-full border rounded-xl p-3"
              />

              <textarea
                placeholder="ملاحظات"
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                className="w-full border rounded-xl p-3 h-28"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3"
              >
                {loading
                  ? "جارٍ الحفظ..."
                  : "حفظ الدفعة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}