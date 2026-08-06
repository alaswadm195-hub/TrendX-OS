"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type Client = {
  id: string;
  name: string;
};

export default function AddInvoiceModal() {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [form, setForm] =
    useState({
      clientId: "",
      customerName: "",
      customerPhone: "",
      title: "",
      description: "",
      totalAmount: "",
      paidAmount: "",
    });

  useEffect(() => {
    if (!open) return;

    async function loadClients() {
      const res = await fetch(
        "/api/clients"
      );

      const data =
        await res.json();

      setClients(data);
    }

    loadClients();
  }, [open]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !form.title ||
      !form.totalAmount
    ) {
      alert(
        "اكمل البيانات المطلوبة"
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/invoices",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            clientId:
              form.clientId || null,

            customerName:
              form.customerName,

            customerPhone:
              form.customerPhone,

            title:
              form.title,

            description:
              form.description,

            totalAmount:
              form.totalAmount,

            paidAmount:
              form.paidAmount || 0,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setOpen(false);

      setForm({
        clientId: "",
        customerName: "",
        customerPhone: "",
        title: "",
        description: "",
        totalAmount: "",
        paidAmount: "",
      });

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
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
      >
        <Plus size={18} />
        فاتورة جديدة
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                إنشاء فاتورة
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
                placeholder="اسم العميل"
                value={
                  form.customerName
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    customerName:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                placeholder="رقم الهاتف"
                value={
                  form.customerPhone
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    customerPhone:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <select
                value={
                  form.clientId
                }
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
                  ربط بعميل موجود (اختياري)
                </option>

                {clients.map(
                  (client) => (
                    <option
                      key={
                        client.id
                      }
                      value={
                        client.id
                      }
                    >
                      {
                        client.name
                      }
                    </option>
                  )
                )}
              </select>

              <input
                placeholder="اسم الخدمة"
                value={form.title}
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
                placeholder="إجمالي المبلغ"
                value={
                  form.totalAmount
                }
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
                value={
                  form.paidAmount
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    paidAmount:
                      e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <textarea
                placeholder="ملاحظات"
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
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
                  : "حفظ الفاتورة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}