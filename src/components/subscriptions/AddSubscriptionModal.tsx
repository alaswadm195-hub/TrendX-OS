"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  Plus,
  X,
} from "lucide-react";

type Client = {
  id: string;
  name: string;
};

type ServiceCategory =
  | "PAGE_MANAGEMENT"
  | "SCREEN_PACKAGES"
  | "OUTDOOR_SHOOTING"
  | "INDOOR_SHOOTING";

const serviceCategories: Array<{
  value: ServiceCategory;
  label: string;
  hint: string;
}> = [
  {
    value:
      "PAGE_MANAGEMENT",
    label:
      "إدارة الصفحات",
    hint:
      "مثال: باقة مطعم، شركة، مدرس، إدارة صفحة",
  },
  {
    value:
      "SCREEN_PACKAGES",
    label:
      "باقات الشاشة",
    hint:
      "مثال: 10 ساعات، 50 ساعة، 100 ساعة",
  },
  {
    value:
      "OUTDOOR_SHOOTING",
    label:
      "تصوير خارجي",
    hint:
      "مثال: حفلة، افتتاح، إعلان خارجي، Event",
  },
  {
    value:
      "INDOOR_SHOOTING",
    label:
      "تصوير داخلي",
    hint:
      "مثال: ريل إعلاني، تصوير منتجات، كورس",
  },
];

const initialForm = {
  clientId: "",
  serviceCategory:
    "" as
      | ServiceCategory
      | "",
  planName: "",
  totalAmount: "",
  paidAmount: "",
  startDate: "",
  duration: "1",
  includedHours: "",
  includedExtraMinutes: "0",
  reelsCount: "5",
  designsCount: "10",
  notes: "",
};

export default function AddSubscriptionModal() {
  const router =
    useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    clientsLoading,
    setClientsLoading,
  ] = useState(false);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState(initialForm);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadClients() {
      setClientsLoading(true);
      setError("");

      try {
        const res =
          await fetch(
            "/api/clients",
            {
              cache:
                "no-store",
            },
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              "تعذر تحميل العملاء",
          );
        }

        if (
          !cancelled
        ) {
          setClients(
            Array.isArray(data)
              ? data
              : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "تعذر تحميل العملاء",
          );
        }
      } finally {
        if (!cancelled) {
          setClientsLoading(
            false,
          );
        }
      }
    }

    loadClients();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const remainingAmount =
    useMemo(() => {
      const total =
        Number(
          form.totalAmount ||
            0,
        );

      const paid =
        Number(
          form.paidAmount ||
            0,
        );

      if (
        !Number.isFinite(
          total,
        ) ||
        !Number.isFinite(
          paid,
        )
      ) {
        return 0;
      }

      return Math.max(
        total - paid,
        0,
      );
    }, [
      form.totalAmount,
      form.paidAmount,
    ]);

  const selectedCategory =
    serviceCategories.find(
      (item) =>
        item.value ===
        form.serviceCategory,
    );

  const isScreenPackage =
    form.serviceCategory ===
    "SCREEN_PACKAGES";

  const isPageManagement =
    form.serviceCategory ===
    "PAGE_MANAGEMENT";

  const isMonthlyPackage =
    isScreenPackage ||
    isPageManagement;

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setError("");
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setError("");

    if (
      !form.clientId ||
      !form.serviceCategory ||
      !form.planName.trim() ||
      !form.totalAmount ||
      !form.startDate
    ) {
      setError(
        "اكمل البيانات المطلوبة",
      );
      return;
    }

    const totalAmount =
      Number(
        form.totalAmount,
      );

    const paidAmount =
      Number(
        form.paidAmount ||
          0,
      );

    const duration =
      isMonthlyPackage
        ? 1
        : Number(
            form.duration,
          );

    const includedHours =
      Number(
        form.includedHours ||
          0,
      );

    const includedExtraMinutes =
      Number(
        form.includedExtraMinutes ||
          0,
      );

    const includedMinutes =
      isScreenPackage
        ? includedHours * 60 +
          includedExtraMinutes
        : null;

    const reelsCount =
      Number(
        form.reelsCount ||
          0,
      );

    const designsCount =
      Number(
        form.designsCount ||
          0,
      );

    if (
      !Number.isFinite(
        totalAmount,
      ) ||
      totalAmount <= 0
    ) {
      setError(
        "إجمالي السعر لازم يكون أكبر من صفر",
      );
      return;
    }

    if (
      !Number.isFinite(
        paidAmount,
      ) ||
      paidAmount < 0
    ) {
      setError(
        "قيمة المدفوع غير صحيحة",
      );
      return;
    }

    if (
      paidAmount >
      totalAmount
    ) {
      setError(
        "المدفوع لا يمكن أن يكون أكبر من إجمالي الاشتراك",
      );
      return;
    }

    if (
      !Number.isInteger(
        duration,
      ) ||
      duration <= 0
    ) {
      setError(
        "مدة الاشتراك غير صحيحة",
      );
      return;
    }

    if (
      isScreenPackage &&
      (
        !Number.isInteger(
          includedHours,
        ) ||
        includedHours < 0 ||
        !Number.isInteger(
          includedExtraMinutes,
        ) ||
        ![
          0,
          15,
          30,
          45,
        ].includes(
          includedExtraMinutes,
        ) ||
        !includedMinutes ||
        includedMinutes <= 0
      )
    ) {
      setError(
        "حدد عدد ساعات باقة الشاشة بشكل صحيح",
      );
      return;
    }

    if (
      isPageManagement &&
      (
        !Number.isInteger(
          reelsCount,
        ) ||
        reelsCount < 0 ||
        !Number.isInteger(
          designsCount,
        ) ||
        designsCount < 0 ||
        reelsCount +
          designsCount <=
          0
      )
    ) {
      setError(
        "حدد عدد الريلزات والتصاميم في الباقة",
      );
      return;
    }

    try {
      setLoading(true);

      const startDate =
        new Date(
          `${form.startDate}T12:00:00`,
        );

      if (
        Number.isNaN(
          startDate.getTime(),
        )
      ) {
        throw new Error(
          "تاريخ البداية غير صحيح",
        );
      }

      const endDate =
        new Date(startDate);

      endDate.setMonth(
        endDate.getMonth() +
          duration,
      );

      const res =
        await fetch(
          "/api/subscriptions",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                clientId:
                  form.clientId,

                serviceCategory:
                  form.serviceCategory,

                planName:
                  form.planName.trim(),

                totalAmount,

                paidAmount,

                startDate:
                  startDate.toISOString(),

                endDate:
                  endDate.toISOString(),

                includedMinutes,

                reelsCount:
                  isPageManagement
                    ? reelsCount
                    : 0,

                designsCount:
                  isPageManagement
                    ? designsCount
                    : 0,

                notes:
                  form.notes.trim() ||
                  null,
              }),
          },
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "فشل حفظ الاشتراك",
        );
      }

      setForm(
        initialForm,
      );

      setOpen(false);

      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء الحفظ",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="flex items-center gap-2 rounded-xl bg-[#123b69] px-5 py-3 font-bold text-white transition hover:bg-[#0f2f55]"
      >
        <Plus size={18} />
        إضافة اشتراك
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div
            dir="rtl"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <p className="text-xs font-bold text-[#f28a32]">
                  Subscription
                </p>

                <h2 className="mt-1 text-2xl font-black text-[#102f55]">
                  إضافة اشتراك جديد
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  حدد القسم الرئيسي ثم اسم الباقة والسعر
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >
              <label className="block space-y-2">
                <span className="text-sm font-bold text-[#17385f]">
                  العميل *
                </span>

                <select
                  required
                  disabled={
                    clientsLoading
                  }
                  value={
                    form.clientId
                  }
                  onChange={(
                    e,
                  ) =>
                    setForm({
                      ...form,
                      clientId:
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-[#f28a32] focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">
                    {clientsLoading
                      ? "جارٍ تحميل العملاء..."
                      : "اختر العميل"}
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
                    ),
                  )}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-[#17385f]">
                  القسم الرئيسي *
                </span>

                <select
                  required
                  value={
                    form.serviceCategory
                  }
                  onChange={(
                    e,
                  ) =>
                    setForm({
                      ...form,
                      serviceCategory:
                        e.target
                          .value as
                          | ServiceCategory
                          | "",
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-[#f28a32] focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">
                    اختر القسم الرئيسي
                  </option>

                  {serviceCategories.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    ),
                  )}
                </select>

                {selectedCategory && (
                  <p className="text-xs font-medium text-slate-400">
                    {
                      selectedCategory.hint
                    }
                  </p>
                )}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-[#17385f]">
                  اسم الباقة / الخدمة *
                </span>

                <input
                  required
                  maxLength={160}
                  placeholder={
                    selectedCategory?.hint ||
                    "مثال: باقة إدارة صفحات"
                  }
                  value={
                    form.planName
                  }
                  onChange={(
                    e,
                  ) =>
                    setForm({
                      ...form,
                      planName:
                        e.target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-[#f28a32] focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    إجمالي السعر *
                  </span>

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      form.totalAmount
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm({
                        ...form,
                        totalAmount:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-[#f28a32]"
                    placeholder="0.00"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    المدفوع
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.paidAmount
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm({
                        ...form,
                        paidAmount:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-[#f28a32]"
                    placeholder="0.00"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    المتبقي
                  </span>

                  <input
                    value={
                      remainingAmount
                    }
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-bold text-[#102f55]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    تاريخ البداية *
                  </span>

                  <input
                    required
                    type="date"
                    value={
                      form.startDate
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm({
                        ...form,
                        startDate:
                          e.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-[#f28a32]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-[#17385f]">
                    المدة
                  </span>

                  {isMonthlyPackage ? (
                    <div className="rounded-xl border border-[#f1ddc6] bg-[#fffaf4] p-3 text-sm font-bold text-[#87511d]">
                      شهر واحد — ثابت لهذه الباقة
                    </div>
                  ) : (
                    <select
                      value={
                        form.duration
                      }
                      onChange={(
                        e,
                      ) =>
                        setForm({
                          ...form,
                          duration:
                            e.target
                              .value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-[#f28a32]"
                    >
                      <option value="1">
                        شهر
                      </option>
                      <option value="3">
                        3 شهور
                      </option>
                      <option value="6">
                        6 شهور
                      </option>
                      <option value="12">
                        سنة
                      </option>
                    </select>
                  )}
                </label>
              </div>

              {isScreenPackage && (
                <div className="rounded-2xl border border-[#e5ebf2] bg-[#f8fafc] p-4">
                  <p className="text-sm font-black text-[#17385f]">
                    رصيد باقة الشاشة
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    كل جلسة استخدام هتخصم تلقائيًا من الرصيد
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-slate-500">
                        عدد الساعات
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.includedHours}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            includedHours: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-[#f28a32]"
                        placeholder="10"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold text-slate-500">
                        دقائق إضافية
                      </span>
                      <select
                        value={form.includedExtraMinutes}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            includedExtraMinutes: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-[#f28a32]"
                      >
                        <option value="0">0 دقيقة</option>
                        <option value="15">15 دقيقة</option>
                        <option value="30">30 دقيقة</option>
                        <option value="45">45 دقيقة</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {isPageManagement && (
                <div className="rounded-2xl border border-[#e5ebf2] bg-[#f8fafc] p-4">
                  <p className="text-sm font-black text-[#17385f]">
                    محتوى باقة إدارة الصفحات
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    الباقة تخلص بمجرد استهلاك كل الريلزات والتصاميم حتى لو الشهر لسه مخلصش
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-slate-500">
                        عدد الريلزات
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.reelsCount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            reelsCount: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-[#f28a32]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold text-slate-500">
                        عدد التصاميم
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.designsCount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            designsCount: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-[#f28a32]"
                      />
                    </label>
                  </div>
                </div>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-bold text-[#17385f]">
                  ملاحظات
                </span>

                <textarea
                  maxLength={2000}
                  placeholder="أي تفاصيل إضافية عن الاشتراك"
                  value={
                    form.notes
                  }
                  onChange={(
                    e,
                  ) =>
                    setForm({
                      ...form,
                      notes:
                        e.target
                          .value,
                    })
                  }
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 p-3 outline-none transition focus:border-[#f28a32]"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  clientsLoading
                }
                className="w-full rounded-xl bg-[#123b69] py-3.5 font-bold text-white transition hover:bg-[#0f2f55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "جارٍ الحفظ..."
                  : "حفظ الاشتراك"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
