"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type Client = {
  id: string;
  name: string;
};

export default function AddSubscriptionModal() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    clientId: "",
    planName: "",
    totalAmount: "",
    paidAmount: "",
    startDate: "",
    duration: "1",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;

    async function loadClients() {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    }

    loadClients();
  }, [open]);

  const remainingAmount = useMemo(() => {
    const total = Number(form.totalAmount || 0);
    const paid = Number(form.paidAmount || 0);

    return Math.max(total - paid, 0);
  }, [form.totalAmount, form.paidAmount]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !form.clientId ||
      !form.planName ||
      !form.totalAmount ||
      !form.startDate
    ) {
      alert("اكمل البيانات المطلوبة");
      return;
    }

    try {
      setLoading(true);

      const startDate = new Date(
        form.startDate
      );

      const endDate = new Date(
        form.startDate
      );

      endDate.setMonth(
        endDate.getMonth() +
          Number(form.duration)
      );

      const res = await fetch(
        "/api/subscriptions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            clientId: form.clientId,
            planName: form.planName,
            totalAmount:
              form.totalAmount,
            paidAmount:
              form.paidAmount || 0,
            startDate,
            endDate,
            notes: form.notes,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setOpen(false);

      setForm({
        clientId: "",
        planName: "",
        totalAmount: "",
        paidAmount: "",
        startDate: "",
        duration: "1",
        notes: "",
      });

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
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition"
      >
        <Plus size={18} />
        إضافة اشتراك
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                إضافة اشتراك جديد
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
              <select
                value={form.clientId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    clientId:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              >
                <option value="">
                  اختر العميل
                </option>

                {clients.map((client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.name}
                  </option>
                ))}
              </select>

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
                value={remainingAmount}
                readOnly
                className="w-full border rounded-xl p-3 bg-slate-50"
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

              <select
                value={form.duration}
                onChange={(e) =>
                  setForm({
                    ...form,
                    duration:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              >
                <option value="1">
                  شهر
                </option>
                <option value="3">
                  3 شهور
                </option>
                <option value="6">
                  6 شهور
                </option>
                <option value="12">
                  سنة
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
                  : "حفظ الاشتراك"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}