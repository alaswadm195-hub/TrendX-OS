"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";

type Subscription = {
  id: string;
  clientId: string;
  planName: string;
  totalAmount: number;
  paidAmount: number;
  startDate: Date;
  endDate: Date;
  status: string;
  notes?: string | null;
};

export default function EditSubscriptionModal({
  subscription,
}: {
  subscription: Subscription;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    planName: subscription.planName,
    totalAmount:
      subscription.totalAmount.toString(),
    paidAmount:
      subscription.paidAmount.toString(),
    startDate: new Date(
      subscription.startDate
    )
      .toISOString()
      .split("T")[0],
    endDate: new Date(
      subscription.endDate
    )
      .toISOString()
      .split("T")[0],
    status: subscription.status,
    notes: subscription.notes || "",
  });

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch(
        `/api/subscriptions/${subscription.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            clientId:
              subscription.clientId,
            planName: form.planName,
            totalAmount:
              form.totalAmount,
            paidAmount:
              form.paidAmount,
            startDate:
              form.startDate,
            endDate:
              form.endDate,
            status: form.status,
            notes: form.notes,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء التعديل"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-blue-600 hover:text-blue-700"
      >
        <Pencil size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                تعديل الاشتراك
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
                placeholder="اسم الباقة"
                value={form.planName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    planName:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                type="number"
                placeholder="إجمالي السعر"
                value={form.totalAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    totalAmount:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                type="number"
                placeholder="المدفوع"
                value={form.paidAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    paidAmount:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    startDate:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    endDate:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              >
                <option value="ACTIVE">
                  ACTIVE
                </option>

                <option value="EXPIRED">
                  EXPIRED
                </option>
              </select>

              <textarea
                placeholder="ملاحظات"
                value={form.notes}
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
              >
                {loading
                  ? "جارٍ الحفظ..."
                  : "حفظ التعديلات"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}