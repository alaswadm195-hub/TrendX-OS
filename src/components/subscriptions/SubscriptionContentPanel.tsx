"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clapperboard,
  Image as ImageIcon,
  Pencil,
  Plus,
  Send,
  Trash2,
  RotateCcw,
} from "lucide-react";

type ContentType = "REEL" | "DESIGN";
type ContentStatus =
  | "PRODUCED"
  | "EDITING"
  | "READY"
  | "SCHEDULED"
  | "PUBLISHED";

type Quota = {
  id: string;
  contentType: ContentType;
  totalCount: number;
};

type ContentItem = {
  id: string;
  contentType: ContentType;
  status: ContentStatus;
  producedAt: string;
  editedAt: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  notes: string | null;
  archivedAt: string | null;
};

type Props = {
  subscriptionId: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  completedAt: string | null;
  quotas: Quota[];
  items: ContentItem[];
};

const statusLabels: Record<ContentStatus, string> = {
  PRODUCED: "تم التنفيذ/التصوير",
  EDITING: "قيد المونتاج/التجهيز",
  READY: "جاهز للنشر",
  SCHEDULED: "محدد للنشر",
  PUBLISHED: "تم النشر",
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return local.toISOString().slice(0, 16);
}

function nowLocalInput() {
  const date = new Date();
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function createInitialForm() {
  return {
    contentType: "REEL" as ContentType,
    producedAt: nowLocalInput(),
    editedAt: "",
    scheduledAt: "",
    publishedAt: "",
    notes: "",
  };
}

export default function SubscriptionContentPanel({
  subscriptionId,
  status,
  completedAt,
  quotas,
  items,
}: Props) {
  const router = useRouter();

  const [setup, setSetup] = useState({
    reelsCount: "5",
    designsCount: "10",
  });

  const [form, setForm] = useState(createInitialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const activeItems = useMemo(
    () => items.filter((item) => !item.archivedAt),
    [items],
  );

  const archivedItems = useMemo(
    () => items.filter((item) => Boolean(item.archivedAt)),
    [items],
  );

  const stats = useMemo(() => {
    const quotaMap = new Map(
      quotas.map((quota) => [quota.contentType, quota.totalCount]),
    );

    const reelUsed = activeItems.filter((item) => item.contentType === "REEL").length;
    const designUsed = activeItems.filter((item) => item.contentType === "DESIGN").length;

    const reelsTotal = quotaMap.get("REEL") ?? 0;
    const designsTotal = quotaMap.get("DESIGN") ?? 0;

    const pendingPublish = activeItems.filter(
      (item) => item.status !== "PUBLISHED",
    ).length;

    const total = reelsTotal + designsTotal;
    const used = reelUsed + designUsed;

    return {
      reelsTotal,
      designsTotal,
      reelUsed,
      designUsed,
      reelRemaining: Math.max(reelsTotal - reelUsed, 0),
      designRemaining: Math.max(designsTotal - designUsed, 0),
      pendingPublish,
      total,
      used,
      percentage:
        total > 0
          ? Math.min(100, Math.round((used / total) * 100))
          : 0,
    };
  }, [activeItems, quotas]);

  const canAddSelectedType =
    form.contentType === "REEL"
      ? stats.reelRemaining > 0
      : stats.designRemaining > 0;

  async function saveQuota(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const reelsCount = Number(setup.reelsCount || 0);
    const designsCount = Number(setup.designsCount || 0);

    if (
      !Number.isInteger(reelsCount) ||
      reelsCount < 0 ||
      !Number.isInteger(designsCount) ||
      designsCount < 0 ||
      reelsCount + designsCount <= 0
    ) {
      setError("حدد عدد الريلزات والتصاميم بشكل صحيح");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/subscriptions/${subscriptionId}/content-quota`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reelsCount, designsCount }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "تعذر حفظ مكونات الباقة",
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر حفظ مكونات الباقة",
      );
    } finally {
      setLoading(false);
    }
  }

  function editItem(item: ContentItem) {
    setEditingId(item.id);
    setError("");
    setForm({
      contentType: item.contentType,
      producedAt: toLocalInput(item.producedAt),
      editedAt: toLocalInput(item.editedAt),
      scheduledAt: toLocalInput(item.scheduledAt),
      publishedAt: toLocalInput(item.publishedAt),
      notes: item.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(createInitialForm());
    setError("");
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.producedAt) {
      setError("حدد تاريخ التنفيذ أو التصوير");
      return;
    }

    if (!editingId && !canAddSelectedType) {
      setError("الرصيد المتبقي من النوع ده خلص");
      return;
    }

    const payload = {
      ...(editingId ? {} : { contentType: form.contentType }),
      producedAt: new Date(form.producedAt).toISOString(),
      editedAt: form.editedAt
        ? new Date(form.editedAt).toISOString()
        : null,
      scheduledAt: form.scheduledAt
        ? new Date(form.scheduledAt).toISOString()
        : null,
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : null,
      notes: form.notes.trim() || null,
    };

    setLoading(true);

    try {
      const endpoint = editingId
        ? `/api/subscriptions/${subscriptionId}/content/${editingId}`
        : `/api/subscriptions/${subscriptionId}/content`;

      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "تعذر حفظ سجل المحتوى",
        );
      }

      setEditingId(null);
      setForm(createInitialForm());
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر حفظ سجل المحتوى",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(itemId: string) {
    if (!window.confirm("أرشفة العنصر وإرجاع وحدته لرصيد الباقة؟ تقدر ترجعه بعدين.")) {
      return;
    }

    setDeletingId(itemId);
    setError("");

    try {
      const response = await fetch(
        `/api/subscriptions/${subscriptionId}/content/${itemId}`,
        { method: "DELETE" },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "تعذر أرشفة العنصر",
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر أرشفة العنصر");
    } finally {
      setDeletingId(null);
    }
  }


  async function restoreItem(itemId: string) {
    setRestoringId(itemId);
    setError("");

    try {
      const response = await fetch(
        `/api/subscriptions/${subscriptionId}/content/${itemId}/restore`,
        { method: "POST" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "تعذر استرجاع العنصر",
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر استرجاع العنصر",
      );
    } finally {
      setRestoringId(null);
    }
  }

  if (quotas.length === 0) {
    return (
      <section className="rounded-[24px] border border-[#e5ebf2] bg-white p-5 shadow-sm md:p-6">
        <div>
          <h2 className="text-xl font-black text-[#102f55]">
            استهلاك باقة إدارة الصفحات
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            حدد مكونات الباقة مرة واحدة، وبعدها النظام يتابع المستهلك والمتبقي تلقائيًا.
          </p>
        </div>

        <form onSubmit={saveQuota} className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">عدد الريلزات</span>
              <input
                type="number"
                min="0"
                step="1"
                value={setup.reelsCount}
                onChange={(event) =>
                  setSetup({ ...setup, reelsCount: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">عدد التصاميم</span>
              <input
                type="number"
                min="0"
                step="1"
                value={setup.designsCount}
                onChange={(event) =>
                  setSetup({ ...setup, designsCount: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              />
            </label>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[#123b69] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "جاري الحفظ..." : "تفعيل متابعة محتوى الباقة"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-[#e5ebf2] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#102f55]">
            استهلاك باقة إدارة الصفحات
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            تنفيذ المحتوى يخصم من الباقة، والنشر له متابعة مستقلة حتى نعرف كل عنصر وصل لفين.
          </p>
        </div>

        <span className="rounded-full bg-[#fff8f1] px-3 py-1 text-xs font-black text-[#d96d1d]">
          {stats.percentage.toLocaleString("ar-EG")}% مستهلك
        </span>
      </div>

      {completedAt && (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            الباقة استُهلكت بالكامل يوم {formatDateTime(completedAt)}، حتى لو تاريخ الشهر لسه مستمر.
          </div>

          {stats.pendingPublish > 0 && (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              تنبيه تشغيلي: {stats.pendingPublish.toLocaleString("ar-EG")} عنصر لسه لم يتم نشره فعليًا.
            </p>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <QuotaCard
          icon={<Clapperboard size={20} />}
          title="الريلزات"
          total={stats.reelsTotal}
          used={stats.reelUsed}
          remaining={stats.reelRemaining}
        />
        <QuotaCard
          icon={<ImageIcon size={20} />}
          title="التصاميم"
          total={stats.designsTotal}
          used={stats.designUsed}
          remaining={stats.designRemaining}
        />
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#f28a32] to-[#123b69] transition-all"
          style={{ width: `${stats.percentage}%` }}
        />
      </div>

      {status !== "CANCELLED" && (
        <form onSubmit={saveItem} className="mt-6 rounded-2xl border border-[#e7edf4] bg-[#fafbfd] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {editingId ? <Pencil size={18} /> : <Plus size={18} />}
              <h3 className="font-black text-[#17385f]">
                {editingId ? "تحديث حالة المحتوى" : "تسجيل محتوى من الباقة"}
              </h3>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">نوع المحتوى</span>
              <select
                value={form.contentType}
                disabled={Boolean(editingId)}
                onChange={(event) =>
                  setForm({ ...form, contentType: event.target.value as ContentType })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none disabled:bg-slate-100"
              >
                <option value="REEL">ريل</option>
                <option value="DESIGN">تصميم</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">
                {form.contentType === "REEL" ? "تاريخ ووقت التصوير" : "تاريخ ووقت تجهيز التصميم"}
              </span>
              <input
                type="datetime-local"
                required
                value={form.producedAt}
                onChange={(event) =>
                  setForm({ ...form, producedAt: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">
                {form.contentType === "REEL" ? "اكتمال المونتاج" : "جاهز للنشر"}
              </span>
              <input
                type="datetime-local"
                value={form.editedAt}
                onChange={(event) =>
                  setForm({ ...form, editedAt: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">موعد النشر المخطط</span>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm({ ...form, scheduledAt: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold text-slate-500">تاريخ ووقت النشر الفعلي</span>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) =>
                  setForm({ ...form, publishedAt: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              />
            </label>
          </div>

          <label className="mt-3 block space-y-2">
            <span className="text-xs font-bold text-slate-500">ملاحظات</span>
            <input
              maxLength={1000}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="مثال: ريل عرض جديد / تصميم افتتاح الفرع"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
            />
          </label>

          {error && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!editingId && !canAddSelectedType)}
            className="mt-4 w-full rounded-xl bg-[#123b69] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "جاري الحفظ..."
              : editingId
                ? "حفظ تحديث المحتوى"
                : canAddSelectedType
                  ? "تسجيل العنصر"
                  : "رصيد النوع ده خلص"}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        {activeItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            لسه مفيش محتوى اتسجل من الباقة
          </div>
        ) : (
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b bg-[#fafbfd] text-xs text-slate-500">
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">التنفيذ/التصوير</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">موعد النشر</th>
                <th className="p-3 text-right">النشر الفعلي</th>
                <th className="p-3 text-right">ملاحظات</th>
                <th className="p-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="p-3 font-black text-[#17385f]">
                    {item.contentType === "REEL" ? "ريل" : "تصميم"}
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {formatDateTime(item.producedAt)}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.status === "SCHEDULED"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                    }`}>
                      {statusLabels[item.status]}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {formatDateTime(item.scheduledAt)}
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {formatDateTime(item.publishedAt)}
                  </td>
                  <td className="p-3 text-sm text-slate-500">
                    {item.notes || "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editItem(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#eef5fc] px-3 py-2 text-xs font-bold text-[#123b69]"
                      >
                        <Pencil size={14} /> تحديث
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => deleteItem(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={14} /> أرشفة
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {stats.pendingPublish > 0 && (
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          <Send size={17} />
          عندك {stats.pendingPublish.toLocaleString("ar-EG")} عنصر اتخصم من الباقة ولسه محتاج متابعة لحد النشر.
        </div>
      )}

      {archivedItems.length > 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-[#17385f]">
                العناصر المؤرشفة
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                لا تدخل في استهلاك الباقة، ويمكن استرجاعها في أي وقت إذا كان الرصيد يسمح.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
              {archivedItems.length.toLocaleString("ar-EG")} مؤرشف
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {archivedItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold text-[#17385f]">
                    {item.contentType === "REEL" ? "ريل" : "تصميم"} • {formatDateTime(item.producedAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    أُرشف: {formatDateTime(item.archivedAt)}
                    {item.notes ? ` • ${item.notes}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={restoringId === item.id}
                  onClick={() => restoreItem(item.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  {restoringId === item.id ? "جاري الاسترجاع..." : "استرجاع"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  );
}

function QuotaCard({
  icon,
  title,
  total,
  used,
  remaining,
}: {
  icon: React.ReactNode;
  title: string;
  total: number;
  used: number;
  remaining: number;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-4">
      <div className="flex items-center gap-2 text-[#123b69]">
        {icon}
        <p className="font-black">{title}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric label="الإجمالي" value={total} />
        <Metric label="المستهلك" value={used} />
        <Metric label="المتبقي" value={remaining} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-[#102f55]">
        {value.toLocaleString("ar-EG")}
      </p>
    </div>
  );
}
