"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddAppointmentModal({
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
    clientId: "",
    employeeId: "",
    customerName: "",
    customerPhone: "",
    appointmentDate: "",
    location: "",
    meetingLink: "",
    notes: "",
  });

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch(
        "/api/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
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

      router.refresh();
    } catch {
      alert("فشل إنشاء الموعد");
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
        إضافة موعد
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
                إضافة موعد
              </h2>

              <input
                required
                placeholder="عنوان الموعد"
                className="w-full border rounded-xl p-3"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title:
                      e.target.value,
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
                      e.target.value,
                  })
                }
              >
                <option value="">
                  اختر العميل
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

              <select
                className="w-full border rounded-xl p-3"
                value={
                  form.employeeId
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    employeeId:
                      e.target.value,
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

              <input
                placeholder="اسم الشخص المسؤول"
                className="w-full border rounded-xl p-3"
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
              />

              <input
                placeholder="رقم الهاتف"
                className="w-full border rounded-xl p-3"
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
              />

              <input
                type="datetime-local"
                required
                className="w-full border rounded-xl p-3"
                value={
                  form.appointmentDate
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    appointmentDate:
                      e.target.value,
                  })
                }
              />

              <input
                placeholder="المكان"
                className="w-full border rounded-xl p-3"
                value={
                  form.location
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    location:
                      e.target.value,
                  })
                }
              />

              <input
                placeholder="رابط الاجتماع"
                className="w-full border rounded-xl p-3"
                value={
                  form.meetingLink
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    meetingLink:
                      e.target.value,
                  })
                }
              />

              <textarea
                rows={4}
                placeholder="ملاحظات"
                className="w-full border rounded-xl p-3"
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes:
                      e.target.value,
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