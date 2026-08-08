"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  user: {
    name: string;
  };
};

type Client = {
  id: string;
  name: string;
  phone: string | null;
};

export default function AddAppointmentModal({
  employees,
  clients,
  whatsappNotificationPhone,
}: {
  employees: Employee[];
  clients: Client[];
  whatsappNotificationPhone: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clientMode, setClientMode] = useState<
    "existing" | "new"
  >("existing");

  const [clientSearch, setClientSearch] =
    useState("");

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

  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    notes: "",
  });

  const filteredClients = clients.filter((client) => {
    const search = clientSearch
      .trim()
      .toLowerCase();

    if (!search) return true;

    return (
      client.name
        .toLowerCase()
        .includes(search) ||
      (client.phone || "")
        .toLowerCase()
        .includes(search)
    );
  });

  function selectExistingClient(
    clientId: string
  ) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    if (!client) {
      setForm({
        ...form,
        clientId: "",
        customerPhone: "",
      });

      return;
    }

    setForm({
      ...form,
      clientId: client.id,
      customerPhone: client.phone || "",
    });
  }

  function switchToNewClient() {
    setClientMode("new");

    setForm({
      ...form,
      clientId: "",
      customerPhone: "",
    });

    setClientSearch("");
  }

  function switchToExistingClient() {
    setClientMode("existing");

    setNewClient({
      name: "",
      phone: "",
      notes: "",
    });
  }

  function resetForm() {
    setForm({
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

    setNewClient({
      name: "",
      phone: "",
      notes: "",
    });

    setClientMode("existing");
    setClientSearch("");
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      clientMode === "existing" &&
      !form.clientId
    ) {
      alert("من فضلك اختر عميلًا موجودًا");
      return;
    }

    if (
      clientMode === "new" &&
      !newClient.name.trim()
    ) {
      alert("من فضلك اكتب اسم العميل");
      return;
    }

    if (
      clientMode === "new" &&
      !newClient.phone.trim()
    ) {
      alert("من فضلك اكتب رقم هاتف العميل");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,

        // الرقم الثابت الذي سيستقبل إشعار الواتساب
        whatsappNotificationPhone,

        // لو عميل جديد، السيرفر سينشئه تلقائيًا
        newClient:
          clientMode === "new"
            ? {
                name: newClient.name.trim(),
                phone: newClient.phone.trim(),
                notes:
                  newClient.notes.trim() || null,
              }
            : null,
      };

      const res = await fetch(
        "/api/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            data.message ||
            "حدث خطأ أثناء إنشاء الموعد"
        );

        return;
      }

      setOpen(false);
      resetForm();

      router.refresh();
    } catch (error) {
      console.error(error);

      alert("فشل إنشاء الموعد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* زر إضافة موعد */}
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition"
      >
        إضافة موعد
      </button>

      {open && (
        <div
          className="
            fixed inset-0
            z-50
            bg-black/50
            p-3
            sm:p-4
            overflow-y-auto
            flex
            items-start
            sm:items-center
            justify-center
          "
        >
          {/* Modal */}
          <div
            className="
              bg-white
              rounded-2xl
              w-full
              max-w-xl
              my-2
              sm:my-8
              max-h-[calc(100dvh-1rem)]
              sm:max-h-[calc(100dvh-4rem)]
              overflow-hidden
              shadow-2xl
              flex
              flex-col
            "
          >
            <form
              onSubmit={handleSubmit}
              className="
                p-4
                sm:p-6
                space-y-4
                overflow-y-auto
                overscroll-contain
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg sm:text-xl font-bold">
                  إضافة موعد
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="
                    text-slate-500
                    hover:text-slate-800
                    text-2xl
                    leading-none
                    w-9
                    h-9
                    flex
                    items-center
                    justify-center
                    rounded-full
                    hover:bg-slate-100
                    shrink-0
                  "
                >
                  ×
                </button>
              </div>

              {/* عنوان الموعد */}
              <input
                required
                placeholder="عنوان الموعد"
                className="
                  w-full
                  border
                  rounded-xl
                  p-3
                  text-base
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                "
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
              />

              {/* العميل */}
              <div className="space-y-3">
                <label className="block font-medium">
                  العميل
                </label>

                {/* اختيار نوع العميل */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={
                      switchToExistingClient
                    }
                    className={`
                      px-3
                      sm:px-4
                      py-2.5
                      rounded-xl
                      border
                      transition
                      text-sm
                      sm:text-base
                      ${
                        clientMode ===
                        "existing"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                      }
                    `}
                  >
                    عميل موجود
                  </button>

                  <button
                    type="button"
                    onClick={
                      switchToNewClient
                    }
                    className={`
                      px-3
                      sm:px-4
                      py-2.5
                      rounded-xl
                      border
                      transition
                      text-sm
                      sm:text-base
                      ${
                        clientMode ===
                        "new"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                      }
                    `}
                  >
                    إضافة عميل جديد
                  </button>
                </div>

                {/* عميل موجود */}
                {clientMode === "existing" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="ابحث باسم العميل أو رقم الهاتف..."
                      className="
                        w-full
                        border
                        rounded-xl
                        p-3
                        text-base
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500/20
                        focus:border-blue-500
                      "
                      value={clientSearch}
                      onChange={(e) =>
                        setClientSearch(
                          e.target.value
                        )
                      }
                    />

                    <select
                      required
                      className="
                        w-full
                        border
                        rounded-xl
                        p-3
                        text-base
                        bg-white
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500/20
                        focus:border-blue-500
                      "
                      value={form.clientId}
                      onChange={(e) =>
                        selectExistingClient(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        اختر العميل
                      </option>

                      {filteredClients.map(
                        (client) => (
                          <option
                            key={client.id}
                            value={client.id}
                          >
                            {client.name}
                            {client.phone
                              ? ` - ${client.phone}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {form.clientId && (
                      <div className="bg-slate-50 border rounded-xl p-3">
                        <p className="text-sm text-slate-500">
                          رقم هاتف العميل
                        </p>

                        <p className="font-medium mt-1 break-all">
                          {form.customerPhone ||
                            "لا يوجد رقم مسجل"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* عميل جديد */}
                {clientMode === "new" && (
                  <div className="space-y-3 bg-slate-50 border rounded-xl p-3 sm:p-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        اسم العميل
                      </label>

                      <input
                        required
                        placeholder="اسم العميل"
                        className="
                          w-full
                          border
                          bg-white
                          rounded-xl
                          p-3
                          text-base
                          outline-none
                          focus:ring-2
                          focus:ring-blue-500/20
                          focus:border-blue-500
                        "
                        value={newClient.name}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        رقم هاتف العميل
                      </label>

                      <input
                        required
                        type="tel"
                        inputMode="tel"
                        placeholder="رقم هاتف العميل"
                        className="
                          w-full
                          border
                          bg-white
                          rounded-xl
                          p-3
                          text-base
                          outline-none
                          focus:ring-2
                          focus:ring-blue-500/20
                          focus:border-blue-500
                        "
                        value={newClient.phone}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        ملاحظات العميل
                      </label>

                      <textarea
                        rows={3}
                        placeholder="ملاحظات عن العميل"
                        className="
                          w-full
                          border
                          bg-white
                          rounded-xl
                          p-3
                          text-base
                          outline-none
                          resize-none
                          focus:ring-2
                          focus:ring-blue-500/20
                          focus:border-blue-500
                        "
                        value={newClient.notes}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* الموظف */}
              <select
                className="
                  w-full
                  border
                  rounded-xl
                  p-3
                  text-base
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                "
                value={form.employeeId}
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

                {employees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.user.name}
                  </option>
                ))}
              </select>

              {/* رقم الواتساب الثابت */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">
                  رقم واتساب الإشعارات
                </label>

                <input
                  type="text"
                  readOnly
                  value={
                    whatsappNotificationPhone
                  }
                  className="
                    w-full
                    border
                    rounded-xl
                    p-3
                    text-base
                    bg-slate-100
                    text-slate-600
                    cursor-not-allowed
                  "
                />

                <p className="text-xs text-slate-500 leading-5">
                  هذا الرقم ثابت ويستقبل
                  إشعارات المواعيد عبر
                  واتساب.
                </p>
              </div>

              {/* رقم العميل */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">
                  رقم هاتف العميل
                </label>

                <input
                  required
                  type="tel"
                  inputMode="tel"
                  placeholder="رقم هاتف العميل"
                  className={`
                    w-full
                    border
                    rounded-xl
                    p-3
                    text-base
                    outline-none
                    ${
                      clientMode ===
                      "existing"
                        ? "bg-slate-100"
                        : "bg-white"
                    }
                    focus:ring-2
                    focus:ring-blue-500/20
                    focus:border-blue-500
                  `}
                  value={form.customerPhone}
                  readOnly={
                    clientMode ===
                    "existing"
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customerPhone:
                        e.target.value,
                    })
                  }
                />

                {clientMode === "existing" && (
                  <p className="text-xs text-slate-500 leading-5">
                    يتم إدخال الرقم تلقائيًا
                    من بيانات العميل.
                  </p>
                )}
              </div>

              {/* اسم الشخص المسؤول */}
              <input
                placeholder="اسم الشخص المسؤول"
                className="
                  w-full
                  border
                  rounded-xl
                  p-3
                  text-base
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                "
                value={form.customerName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customerName:
                      e.target.value,
                  })
                }
              />

              {/* التاريخ */}
              <input
                type="datetime-local"
                required
                className="
                  w-full
                  border
                  rounded-xl
                  p-3
                  text-base
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                "
                value={form.appointmentDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    appointmentDate:
                      e.target.value,
                  })
                }
              />

              {/* المكان */}
              <input
                placeholder="المكان"
                className="
                  w-full
                  border
                  rounded-xl
                  p-3
                  text-base
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                "
                value={form.location}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location:
                      e.target.value,
                  })
                }
              />

              {/* رابط الاجتماع */}
              <input
                type="url"
                placeholder="رابط الاجتماع"
                className="
                  w-full
                  border
                  rounded-xl
                  p-3
                  text-base
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                "
                value={form.meetingLink}
                onChange={(e) =>
                  setForm({
                    ...form,
                    meetingLink:
                      e.target.value,
                  })
                }
              />

              {/* ملاحظات الموعد */}
              <textarea
                rows={4}
                placeholder="ملاحظات الموعد"
                className="
                  w-full
                  border
                  rounded-xl
                  p-3
                  text-base
                  outline-none
                  resize-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                "
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
                  })
                }
              />

              {/* الأزرار */}
              <div
                className="
                  flex
                  flex-col-reverse
                  sm:flex-row
                  sm:justify-end
                  gap-2
                  sm:gap-3
                  pt-2
                  pb-1
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="
                    w-full
                    sm:w-auto
                    border
                    px-5
                    py-3
                    rounded-xl
                    hover:bg-slate-50
                    text-base
                  "
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full
                    sm:w-auto
                    bg-blue-600
                    text-white
                    px-5
                    py-3
                    rounded-xl
                    disabled:opacity-50
                    hover:bg-blue-700
                    text-base
                  "
                >
                  {loading
                    ? "جاري الحفظ..."
                    : "إنشاء الموعد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}