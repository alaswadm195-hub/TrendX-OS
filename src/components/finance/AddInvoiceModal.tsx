"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Search } from "lucide-react";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
};

type ClientMode = "existing" | "new";

export default function AddInvoiceModal() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientMode, setClientMode] =
    useState<ClientMode>("existing");

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);

  const [form, setForm] = useState({
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
      try {
        const res = await fetch("/api/clients");

        if (!res.ok) {
          throw new Error("Failed to load clients");
        }

        const data = await res.json();

        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        alert("فشل تحميل العملاء");
      }
    }

    loadClients();
  }, [open]);

  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();

    if (!search) {
      return clients.slice(0, 20);
    }

    return clients
      .filter((client) => {
        const name = client.name?.toLowerCase() || "";
        const phone = client.phone?.toLowerCase() || "";

        return (
          name.includes(search) ||
          phone.includes(search)
        );
      })
      .slice(0, 20);
  }, [clients, clientSearch]);

  function selectExistingClient(client: Client) {
    setSelectedClient(client);

    setForm((prev) => ({
      ...prev,
      clientId: client.id,
      customerName: client.name,
      customerPhone: client.phone || "",
    }));

    setClientSearch("");
  }

  function switchToExistingClient() {
    setClientMode("existing");

    setSelectedClient(null);

    setForm((prev) => ({
      ...prev,
      clientId: "",
      customerName: "",
      customerPhone: "",
    }));
  }

  function switchToNewClient() {
    setClientMode("new");

    setSelectedClient(null);

    setClientSearch("");

    setForm((prev) => ({
      ...prev,
      clientId: "",
      customerName: "",
      customerPhone: "",
    }));
  }

  function resetForm() {
    setClientMode("existing");

    setSelectedClient(null);
    setClientSearch("");

    setForm({
      clientId: "",
      customerName: "",
      customerPhone: "",
      title: "",
      description: "",
      totalAmount: "",
      paidAmount: "",
    });
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.customerName.trim()) {
      alert("اسم العميل مطلوب");
      return;
    }

    if (!form.customerPhone.trim()) {
      alert("رقم هاتف العميل مطلوب");
      return;
    }

    if (!form.title.trim()) {
      alert("اسم الخدمة مطلوب");
      return;
    }

    if (!form.totalAmount) {
      alert("إجمالي المبلغ مطلوب");
      return;
    }

    try {
      setLoading(true);

      let clientId = form.clientId;

      /*
       * لو العميل جديد:
       * ننشئه أولاً في قاعدة البيانات
       * وبعدها نستخدم الـ id بتاعه في الفاتورة.
       */
      if (clientMode === "new") {
        const clientRes = await fetch(
          "/api/clients",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: form.customerName.trim(),
              phone: form.customerPhone.trim(),
              notes: "",
            }),
          }
        );

        const clientData =
          await clientRes.json();

        if (!clientRes.ok) {
          throw new Error(
            clientData.message ||
              clientData.error ||
              "فشل إنشاء العميل"
          );
        }

        clientId = clientData.id;
      }

      /*
       * إنشاء الفاتورة بعد تحديد العميل.
       */
      const invoiceRes = await fetch(
        "/api/invoices",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            clientId: clientId || null,

            customerName:
              form.customerName.trim(),

            customerPhone:
              form.customerPhone.trim(),

            title: form.title.trim(),

            description:
              form.description.trim(),

            totalAmount:
              form.totalAmount,

            paidAmount:
              form.paidAmount || 0,
          }),
        }
      );

      const invoiceData =
        await invoiceRes.json();

      if (!invoiceRes.ok) {
        throw new Error(
          invoiceData.message ||
            invoiceData.error ||
            "فشل إنشاء الفاتورة"
        );
      }

      setOpen(false);
      resetForm();

      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء الحفظ"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
      >
        <Plus size={18} />
        فاتورة جديدة
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                إنشاء فاتورة
              </h2>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="text-slate-500 hover:text-slate-900"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* اختيار نوع العميل */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  العميل
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={
                      switchToExistingClient
                    }
                    className={`rounded-xl border px-4 py-3 transition ${
                      clientMode ===
                      "existing"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    عميل موجود
                  </button>

                  <button
                    type="button"
                    onClick={
                      switchToNewClient
                    }
                    className={`rounded-xl border px-4 py-3 transition ${
                      clientMode === "new"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    إضافة عميل جديد
                  </button>
                </div>
              </div>

              {/* عميل موجود */}
              {clientMode === "existing" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      placeholder="ابحث باسم العميل أو رقم الهاتف..."
                      value={clientSearch}
                      onChange={(e) =>
                        setClientSearch(
                          e.target.value
                        )
                      }
                      className="w-full border rounded-xl p-3 pr-11"
                    />
                  </div>

                  {selectedClient && (
                    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-blue-900">
                            {
                              selectedClient.name
                            }
                          </p>

                          <p className="text-sm text-blue-700 mt-1">
                            {selectedClient.phone ||
                              "لا يوجد رقم هاتف"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(
                              null
                            );

                            setForm(
                              (prev) => ({
                                ...prev,
                                clientId:
                                  "",
                                customerName:
                                  "",
                                customerPhone:
                                  "",
                              })
                            );
                          }}
                          className="text-red-600 text-sm"
                        >
                          تغيير
                        </button>
                      </div>
                    </div>
                  )}

                  {!selectedClient &&
                    clientSearch && (
                      <div className="border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                        {filteredClients.length >
                        0 ? (
                          filteredClients.map(
                            (client) => (
                              <button
                                type="button"
                                key={
                                  client.id
                                }
                                onClick={() =>
                                  selectExistingClient(
                                    client
                                  )
                                }
                                className="w-full text-right px-4 py-3 hover:bg-slate-50 border-b last:border-b-0"
                              >
                                <p className="font-medium">
                                  {
                                    client.name
                                  }
                                </p>

                                <p className="text-sm text-slate-500 mt-1">
                                  {client.phone ||
                                    "لا يوجد رقم هاتف"}
                                </p>
                              </button>
                            )
                          )
                        ) : (
                          <div className="p-4 text-center text-slate-500">
                            لا يوجد عميل مطابق
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* عميل جديد */}
              {clientMode === "new" && (
                <div className="space-y-3">
                  <input
                    required
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
                    required
                    type="tel"
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

                  <p className="text-xs text-slate-500">
                    سيتم إضافة العميل تلقائيًا
                    إلى قائمة العملاء عند حفظ
                    الفاتورة.
                  </p>
                </div>
              )}

              {/* بيانات العميل المختار */}
              {clientMode ===
                "existing" &&
                selectedClient && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-500 mb-1">
                        اسم العميل
                      </label>

                      <input
                        value={
                          form.customerName
                        }
                        readOnly
                        className="w-full border rounded-xl p-3 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-500 mb-1">
                        رقم الهاتف
                      </label>

                      <input
                        value={
                          form.customerPhone
                        }
                        readOnly
                        className="w-full border rounded-xl p-3 bg-slate-50"
                      />
                    </div>
                  </div>
                )}

              {/* اسم الخدمة */}
              <input
                required
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

              {/* الإجمالي */}
              <input
                required
                type="number"
                min="0"
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

              {/* المدفوع */}
              <input
                type="number"
                min="0"
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

              {/* الملاحظات */}
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3"
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