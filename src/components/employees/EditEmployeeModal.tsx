"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EmployeeProps = {
  employee: {
    id: string;
    phone: string | null;
    position: string | null;
    salary: number | null;
    address: string | null;
    hireDate: Date | null;
    status: string;
    user: {
      name: string;
      email: string;
    };
  };
};

export default function EditEmployeeModal({
  employee,
}: EmployeeProps) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState({
      phone:
        employee.phone || "",
      position:
        employee.position || "",
      salary:
        employee.salary?.toString() ||
        "",
      address:
        employee.address || "",
      hireDate:
        employee.hireDate
          ? new Date(
              employee.hireDate
            )
              .toISOString()
              .split("T")[0]
          : "",
      status:
        employee.status,
    });

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch(
        `/api/employees/${employee.id}`,
        {
          method: "PUT",
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
        throw new Error();
      }

      setOpen(false);

      router.refresh();
    } catch {
      alert(
        "فشل تعديل الموظف"
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
        className="text-blue-600 hover:text-blue-700 font-medium"
      >
        تعديل
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                تعديل الموظف
              </h2>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="p-6 space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={
                    employee.user
                      .name
                  }
                  disabled
                  className="border rounded-xl p-3 bg-slate-100"
                />

                <input
                  value={
                    employee.user
                      .email
                  }
                  disabled
                  className="border rounded-xl p-3 bg-slate-100"
                />

                <input
                  placeholder="الهاتف"
                  className="border rounded-xl p-3"
                  value={
                    form.phone
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone:
                        e.target
                          .value,
                    })
                  }
                />

                <input
                  placeholder="الوظيفة"
                  className="border rounded-xl p-3"
                  value={
                    form.position
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      position:
                        e.target
                          .value,
                    })
                  }
                />

                <input
                  type="number"
                  placeholder="الراتب"
                  className="border rounded-xl p-3"
                  value={
                    form.salary
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      salary:
                        e.target
                          .value,
                    })
                  }
                />

                <input
                  type="date"
                  className="border rounded-xl p-3"
                  value={
                    form.hireDate
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hireDate:
                        e.target
                          .value,
                    })
                  }
                />

                <select
                  className="border rounded-xl p-3"
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target
                          .value,
                    })
                  }
                >
                  <option value="ACTIVE">
                    نشط
                  </option>

                  <option value="VACATION">
                    إجازة
                  </option>

                  <option value="SUSPENDED">
                    موقوف
                  </option>
                </select>
              </div>

              <textarea
                rows={3}
                placeholder="العنوان"
                className="border rounded-xl p-3 w-full"
                value={
                  form.address
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    address:
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
                    : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}