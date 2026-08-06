"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddTaskModal({
  employees,
  clients,
}: {
  employees: {
    id: string;
    user: {
      name: string;
    };
  }[];

  clients: {
    id: string;
    name: string;
  }[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    clientId: "",
    employeeId: "",
    priority: "ON_TIME",
    dueDate: "",
    fileUrl: "",
  });

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch(
        "/api/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            form
          ),
        }
      );

      if (!res.ok) {
        const data =
          await res.json();

        alert(
          data.error ||
            "حدث خطأ"
        );

        return;
      }

      setOpen(false);

      setForm({
        title: "",
        description: "",
        clientId: "",
        employeeId: "",
        priority:
          "ON_TIME",
        dueDate: "",
        fileUrl: "",
      });

      router.refresh();
    } catch {
      alert(
        "فشل إنشاء المهمة"
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
        className="bg-blue-600 text-white px-5 py-3 rounded-xl"
      >
        إضافة مهمة
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl">
            <form
              onSubmit={
                handleSubmit
              }
              className="p-6 space-y-4"
            >
              <h2 className="text-xl font-bold">
                إضافة مهمة
              </h2>

              <input
                required
                placeholder="عنوان المهمة"
                className="w-full border rounded-xl p-3"
                value={
                  form.title
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    title:
                      e.target
                        .value,
                  })
                }
              />

              <textarea
                placeholder="وصف المهمة"
                className="w-full border rounded-xl p-3"
                rows={4}
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
                      e.target
                        .value,
                  })
                }
              />

              <select
                required
                className="w-full border rounded-xl p-3"
                value={
                  form.clientId
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    clientId:
                      e.target
                        .value,
                  })
                }
              >
                <option value="">
                  اختر العميل
                </option>

                {clients.map(
                  (
                    client
                  ) => (
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

              <select
                required
                className="w-full border rounded-xl p-3"
                value={
                  form.employeeId
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    employeeId:
                      e.target
                        .value,
                  })
                }
              >
                <option value="">
                  اختر الموظف
                </option>

                {employees.map(
                  (
                    employee
                  ) => (
                    <option
                      key={
                        employee.id
                      }
                      value={
                        employee.id
                      }
                    >
                      {
                        employee
                          .user
                          .name
                      }
                    </option>
                  )
                )}
              </select>

              <select
                className="w-full border rounded-xl p-3"
                value={
                  form.priority
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority:
                      e.target
                        .value,
                  })
                }
              >
                <option value="URGENT">
                  مستعجل 🔥
                </option>

                <option value="ON_TIME">
                  تسليم في معاده
                </option>
              </select>

              <input
                type="date"
                required
                className="w-full border rounded-xl p-3"
                value={
                  form.dueDate
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    dueDate:
                      e.target
                        .value,
                  })
                }
              />

              <input
                type="url"
                placeholder="رابط الملفات (اختياري)"
                className="w-full border rounded-xl p-3"
                value={
                  form.fileUrl
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    fileUrl:
                      e.target
                        .value,
                  })
                }
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                  className="border px-5 py-3 rounded-xl"
                >
                  إلغاء
                </button>

                <button
                  disabled={
                    loading
                  }
                  className="bg-blue-600 text-white px-5 py-3 rounded-xl"
                >
                  {loading
                    ? "جاري الحفظ..."
                    : "إنشاء"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}