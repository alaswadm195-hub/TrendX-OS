"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddEmployeeModal() {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
      phone: "",
      position: "",
      salary: "",
      address: "",
      hireDate: "",
      status: "ACTIVE",
    });

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch(
        "/api/employees",
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
        throw new Error(
          "Failed"
        );
      }

      setOpen(false);

      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        position: "",
        salary: "",
        address: "",
        hireDate: "",
        status: "ACTIVE",
      });

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء إضافة الموظف"
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
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition"
      >
        إضافة موظف
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                إضافة موظف جديد
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
                  required
                  placeholder="الاسم"
                  className="border rounded-xl p-3"
                  value={
                    form.name
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e
                        .target
                        .value,
                    })
                  }
                />

                <input
                  required
                  type="email"
                  placeholder="البريد الإلكتروني"
                  className="border rounded-xl p-3"
                  value={
                    form.email
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email:
                        e.target
                          .value,
                    })
                  }
                />

                <input
                  required
                  type="password"
                  placeholder="كلمة المرور"
                  className="border rounded-xl p-3"
                  value={
                    form.password
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password:
                        e.target
                          .value,
                    })
                  }
                />

                <input
                  placeholder="رقم الهاتف"
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
                placeholder="العنوان"
                className="border rounded-xl p-3 w-full"
                rows={3}
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

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                  className="px-5 py-3 border rounded-xl"
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
                    : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}