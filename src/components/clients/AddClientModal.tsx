"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function AddClientModal() {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("اسم العميل مطلوب");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error(
          "Failed to create client"
        );
      }

      setOpen(false);

      setForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        notes: "",
      });

      router.refresh();
    } catch (error) {
      console.error(error);

      alert("حدث خطأ أثناء الإضافة");
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
        إضافة عميل
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                إضافة عميل جديد
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
                placeholder="اسم العميل"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                placeholder="رقم الهاتف"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                placeholder="البريد الإلكتروني"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <input
                placeholder="الشركة"
                value={form.company}
                onChange={(e) =>
                  setForm({
                    ...form,
                    company: e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />

              <textarea
                placeholder="ملاحظات"
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
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
                  : "حفظ العميل"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}