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
    notes: "",
  });

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("اسم العميل مطلوب");
      return;
    }

    if (!form.phone.trim()) {
      alert("رقم الهاتف مطلوب");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/clients",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            notes:
              form.notes.trim() || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to create client"
        );
      }

      setOpen(false);

      setForm({
        name: "",
        phone: "",
        notes: "",
      });

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء الإضافة"
      );
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
        <Plus size={20} />
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
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="text-slate-500 hover:text-slate-800"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* اسم العميل */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  اسم العميل
                </label>

                <input
                  required
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
              </div>

              {/* رقم الهاتف */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  رقم الهاتف
                </label>

                <input
                  required
                  type="tel"
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
              </div>

              {/* الملاحظات */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ملاحظات
                </label>

                <textarea
                  placeholder="ملاحظات عن العميل"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3 h-28"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3"
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