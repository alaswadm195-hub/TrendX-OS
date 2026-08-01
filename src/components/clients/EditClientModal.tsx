"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
};

export default function EditClientModal({
  client,
}: {
  client: Client;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: client.name || "",
    phone: client.phone || "",
    email: client.email || "",
    company: client.company || "",
    notes: client.notes || "",
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch(
        `/api/clients/${client.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("فشل تعديل العميل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
      >
        <Pencil size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                تعديل العميل
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
                  : "حفظ التعديلات"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}