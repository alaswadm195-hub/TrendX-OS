"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Client = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  user: {
    name: string;
  };
};

type AppointmentData = {
  id: string;
  title: string;
  clientId: string;
  employeeId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  appointmentDate: string;
  endDate: string | null;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
  status: string;
};

export default function AppointmentActions({
  appointment,
}: {
  appointment: AppointmentData;
}) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [form, setForm] = useState({
    title: appointment.title,
    clientId: appointment.clientId,
    employeeId:
      appointment.employeeId || "",
    customerName:
      appointment.customerName || "",
    customerPhone:
      appointment.customerPhone || "",
    appointmentDate: "",
    endDate: "",
    location:
      appointment.location || "",
    meetingLink:
      appointment.meetingLink || "",
    notes: appointment.notes || "",
  });

  function formatDateTimeLocal(
    value: string | null
  ) {
    if (!value) return "";

    const date = new Date(value);

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");
    const hours = String(
      date.getHours()
    ).padStart(2, "0");
    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async function openEdit() {
    setForm({
      title: appointment.title,
      clientId: appointment.clientId,
      employeeId:
        appointment.employeeId || "",
      customerName:
        appointment.customerName || "",
      customerPhone:
        appointment.customerPhone || "",
      appointmentDate:
        formatDateTimeLocal(
          appointment.appointmentDate
        ),
      endDate:
        formatDateTimeLocal(
          appointment.endDate
        ),
      location:
        appointment.location || "",
      meetingLink:
        appointment.meetingLink || "",
      notes: appointment.notes || "",
    });

    setEditing(true);

    try {
      const [
        clientsRes,
        employeesRes,
      ] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/employees"),
      ]);

      if (clientsRes.ok) {
        setClients(
          await clientsRes.json()
        );
      }

      if (employeesRes.ok) {
        setEmployees(
          await employeesRes.json()
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function updateStatus(
    newStatus: string
  ) {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/appointments/${appointment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء تحديث الموعد"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("اكتب عنوان الموعد");
      return;
    }

    if (!form.clientId) {
      alert("اختر العميل");
      return;
    }

    if (!form.appointmentDate) {
      alert(
        "حدد تاريخ ووقت الموعد"
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/appointments/${appointment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: form.title,
            clientId: form.clientId,
            employeeId:
              form.employeeId || null,
            customerName:
              form.customerName || null,
            customerPhone:
              form.customerPhone || null,
            appointmentDate:
              new Date(
                form.appointmentDate
              ).toISOString(),
            endDate: form.endDate
              ? new Date(
                  form.endDate
                ).toISOString()
              : null,
            location:
              form.location || null,
            meetingLink:
              form.meetingLink || null,
            notes:
              form.notes || null,
          }),
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      setEditing(false);
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء تعديل الموعد"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 mt-5">
        <button
          type="button"
          onClick={openEdit}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
        >
          تعديل الموعد
        </button>

        {appointment.status ===
          "CONFIRMED" && (
          <>
            <button
              disabled={loading}
              onClick={() =>
                updateStatus(
                  "COMPLETED"
                )
              }
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              إكمال الموعد
            </button>

            <button
              disabled={loading}
              onClick={() =>
                updateStatus(
                  "NO_SHOW"
                )
              }
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              لم يحضر
            </button>
          </>
        )}

        {appointment.status !==
          "CANCELLED" &&
          appointment.status !==
            "COMPLETED" &&
          appointment.status !==
            "NO_SHOW" && (
            <button
              disabled={loading}
              onClick={() =>
                updateStatus(
                  "CANCELLED"
                )
              }
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              إلغاء الموعد
            </button>
          )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  تعديل الموعد
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  عدّل بيانات الموعد ثم احفظ التغييرات
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditing(false)
                }
                className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="p-6 space-y-5"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    عنوان الموعد
                  </label>

                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        title:
                          e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    العميل
                  </label>

                  <select
                    required
                    value={form.clientId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        clientId:
                          e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="">
                      اختر العميل
                    </option>

                    {clients.map(
                      (client) => (
                        <option
                          key={client.id}
                          value={client.id}
                        >
                          {client.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    الموظف المسؤول
                  </label>

                  <select
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="">
                      بدون موظف
                    </option>

                    {employees.map(
                      (employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.user.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    اسم المسؤول
                  </label>

                  <input
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    رقم الهاتف
                  </label>

                  <input
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    تاريخ ووقت البداية
                  </label>

                  <input
                    required
                    type="datetime-local"
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    تاريخ ووقت النهاية
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.endDate
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        endDate:
                          e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    المكان
                  </label>

                  <input
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    رابط الاجتماع
                  </label>

                  <input
                    type="url"
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  الملاحظات
                </label>

                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes:
                        e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditing(false)
                  }
                  className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
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