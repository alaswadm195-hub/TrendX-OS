"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  Clock3,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";

type UsageSession = {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  notes: string | null;
  archivedAt: string | null;
};

type Props = {
  subscriptionId: string;
  status:
    | "ACTIVE"
    | "EXPIRED"
    | "CANCELLED";
  includedMinutes:
    | number
    | null;
  completedAt:
    | string
    | null;
  sessions: UsageSession[];
};

function formatMinutes(
  minutes: number,
) {
  const hours =
    Math.floor(
      minutes / 60,
    );

  const rest =
    minutes % 60;

  if (
    hours > 0 &&
    rest > 0
  ) {
    return `${hours.toLocaleString(
      "ar-EG",
    )} س ${rest.toLocaleString(
      "ar-EG",
    )} د`;
  }

  if (hours > 0) {
    return `${hours.toLocaleString(
      "ar-EG",
    )} ساعة`;
  }

  return `${rest.toLocaleString(
    "ar-EG",
  )} دقيقة`;
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      timeZone:
        "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function todayValue() {
  const now = new Date();

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60000,
    );

  return local
    .toISOString()
    .slice(0, 10);
}

export default function SubscriptionUsagePanel({
  subscriptionId,
  status,
  includedMinutes,
  completedAt,
  sessions,
}: Props) {
  const router =
    useRouter();

  const [
    setupHours,
    setSetupHours,
  ] = useState("10");

  const [
    setupMinutes,
    setSetupMinutes,
  ] = useState("0");

  const [date, setDate] =
    useState(
      todayValue(),
    );

  const [
    startTime,
    setStartTime,
  ] = useState("");

  const [
    endTime,
    setEndTime,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    string | null
  >(null);

  const [
    restoringId,
    setRestoringId,
  ] = useState<
    string | null
  >(null);

  const [error, setError] =
    useState("");

  const activeSessions =
    useMemo(
      () =>
        sessions.filter(
          (session) =>
            !session.archivedAt,
        ),
      [sessions],
    );

  const archivedSessions =
    useMemo(
      () =>
        sessions.filter(
          (
            session,
          ): session is UsageSession & {
            archivedAt: string;
          } =>
            session.archivedAt !==
            null,
        ),
      [sessions],
    );

  const usedMinutes =
    useMemo(
      () =>
        activeSessions.reduce(
          (sum, item) =>
            sum +
            item.durationMinutes,
          0,
        ),
      [activeSessions],
    );

  const remainingMinutes =
    includedMinutes === null
      ? null
      : Math.max(
          includedMinutes -
            usedMinutes,
          0,
        );

  const usagePercentage =
    includedMinutes &&
    includedMinutes > 0
      ? Math.min(
          100,
          Math.round(
            (usedMinutes /
              includedMinutes) *
              100,
          ),
        )
      : 0;

  const previewMinutes =
    useMemo(() => {
      if (
        !date ||
        !startTime ||
        !endTime
      ) {
        return 0;
      }

      const start =
        new Date(
          `${date}T${startTime}:00`,
        );

      const end =
        new Date(
          `${date}T${endTime}:00`,
        );

      const diff =
        Math.round(
          (end.getTime() -
            start.getTime()) /
            60000,
        );

      return diff > 0
        ? diff
        : 0;
    }, [
      date,
      startTime,
      endTime,
    ]);

  async function enableTracking(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();

    const hours =
      Number(
        setupHours,
      );

    const minutes =
      Number(
        setupMinutes,
      );

    const total =
      hours * 60 +
      minutes;

    if (
      !Number.isInteger(
        hours,
      ) ||
      hours < 0 ||
      ![
        0,
        15,
        30,
        45,
      ].includes(minutes) ||
      total <= 0
    ) {
      setError(
        "حدد عدد ساعات صحيح",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/subscriptions/${subscriptionId}/usage-limit`,
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                includedMinutes:
                  total,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "تعذر تفعيل تتبع الساعات",
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تفعيل تتبع الساعات",
      );
    } finally {
      setLoading(false);
    }
  }

  async function addSession(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !date ||
      !startTime ||
      !endTime
    ) {
      setError(
        "حدد التاريخ ووقت البداية والنهاية",
      );
      return;
    }

    if (
      previewMinutes <= 0
    ) {
      setError(
        "وقت النهاية لازم يكون بعد وقت البداية",
      );
      return;
    }

    if (
      remainingMinutes !==
        null &&
      previewMinutes >
        remainingMinutes
    ) {
      setError(
        `المتبقي في الباقة ${formatMinutes(
          remainingMinutes,
        )} فقط`,
      );
      return;
    }

    const startAt =
      new Date(
        `${date}T${startTime}:00`,
      );

    const endAt =
      new Date(
        `${date}T${endTime}:00`,
      );

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/subscriptions/${subscriptionId}/usage`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                startAt:
                  startAt.toISOString(),
                endAt:
                  endAt.toISOString(),
                notes:
                  notes.trim() ||
                  null,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "تعذر تسجيل الجلسة",
        );
      }

      setStartTime("");
      setEndTime("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تسجيل الجلسة",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(
    usageId: string,
  ) {
    const confirmed =
      window.confirm(
        "أرشفة الجلسة وإرجاع وقتها لرصيد الباقة؟ تقدر ترجّعها بعدين.",
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      usageId,
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/subscriptions/${subscriptionId}/usage/${usageId}`,
          {
            method:
              "DELETE",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "تعذر حذف الجلسة",
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر أرشفة الجلسة",
      );
    } finally {
      setDeletingId(
        null,
      );
    }
  }


  async function restoreSession(
    usageId: string,
  ) {
    setRestoringId(
      usageId,
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/subscriptions/${subscriptionId}/usage/${usageId}/restore`,
          {
            method:
              "POST",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "تعذر استرجاع الجلسة",
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر استرجاع الجلسة",
      );
    } finally {
      setRestoringId(
        null,
      );
    }
  }

  if (
    includedMinutes ===
    null
  ) {
    return (
      <section className="rounded-[24px] border border-[#e5ebf2] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5f8fc] text-[#123b69]">
            <Clock3
              size={21}
            />
          </div>

          <div>
            <h2 className="text-xl font-black text-[#102f55]">
              استهلاك الباقة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              الاشتراك ده لسه
              ملوش رصيد ساعات
              محدد
            </p>
          </div>
        </div>

        <form
          onSubmit={
            enableTracking
          }
          className="mt-5 rounded-2xl bg-[#f8fafc] p-4"
        >
          <p className="text-sm font-bold text-[#17385f]">
            تفعيل تتبع الساعات
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">
                الساعات
              </span>

              <input
                type="number"
                min="0"
                step="1"
                value={
                  setupHours
                }
                onChange={(
                  event,
                ) =>
                  setSetupHours(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500">
                دقائق إضافية
              </span>

              <select
                value={
                  setupMinutes
                }
                onChange={(
                  event,
                ) =>
                  setSetupMinutes(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
              >
                <option value="0">
                  0
                </option>
                <option value="15">
                  15
                </option>
                <option value="30">
                  30
                </option>
                <option value="45">
                  45
                </option>
              </select>
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
            {loading
              ? "جاري الحفظ..."
              : "تفعيل تتبع الساعات"}
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
            استهلاك الباقة
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            متابعة الوقت المستخدم
            والمتبقي بعيدًا عن
            الدفعات المالية
          </p>
        </div>

        <span className="rounded-full bg-[#fff8f1] px-3 py-1 text-xs font-black text-[#d96d1d]">
          {usagePercentage.toLocaleString(
            "ar-EG",
          )}
          % مستخدم
        </span>
      </div>

      {completedAt && (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          تم استهلاك رصيد الساعات بالكامل يوم {formatDateTime(
            completedAt,
          )}. الباقة مكتملة استخدامًا حتى لو تاريخ الشهر لسه مستمر.
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <UsageMetric
          label="إجمالي الباقة"
          value={formatMinutes(
            includedMinutes,
          )}
        />

        <UsageMetric
          label="المستخدم"
          value={formatMinutes(
            usedMinutes,
          )}
        />

        <UsageMetric
          label="المتبقي"
          value={formatMinutes(
            remainingMinutes ??
              0,
          )}
        />
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#f28a32] to-[#123b69] transition-all"
          style={{
            width: `${usagePercentage}%`,
          }}
        />
      </div>

      {status !==
        "CANCELLED" &&
        (remainingMinutes ??
          0) > 0 && (
          <form
            onSubmit={
              addSession
            }
            className="mt-6 rounded-2xl border border-[#e7edf4] bg-[#fafbfd] p-4"
          >
            <div className="mb-4 flex items-center gap-2">
              <Plus
                size={18}
                className="text-[#f28a32]"
              />

              <h3 className="font-black text-[#17385f]">
                تسجيل جلسة جديدة
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-500">
                  التاريخ
                </span>

                <input
                  type="date"
                  required
                  value={date}
                  onChange={(
                    event,
                  ) =>
                    setDate(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-500">
                  من الساعة
                </span>

                <input
                  type="time"
                  required
                  value={
                    startTime
                  }
                  onChange={(
                    event,
                  ) =>
                    setStartTime(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-500">
                  إلى الساعة
                </span>

                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(
                    event,
                  ) =>
                    setEndTime(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#f28a32]"
                />
              </label>
            </div>

            {previewMinutes >
              0 && (
              <div className="mt-3 rounded-xl bg-[#eef5fc] px-3 py-2 text-sm font-bold text-[#123b69]">
                مدة الجلسة:{" "}
                {formatMinutes(
                  previewMinutes,
                )}
              </div>
            )}

            <label className="mt-3 block space-y-2">
              <span className="text-xs font-bold text-slate-500">
                ملاحظات
              </span>

              <input
                maxLength={1000}
                value={notes}
                onChange={(
                  event,
                ) =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
                placeholder="مثال: تصوير 4 ريلز"
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
              disabled={
                loading
              }
              className="mt-4 w-full rounded-xl bg-[#123b69] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading
                ? "جاري التسجيل..."
                : "تسجيل الجلسة"}
            </button>
          </form>
        )}

      {activeSessions.length ===
      0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          لم يتم تسجيل أي جلسات
          استخدام حتى الآن
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b bg-[#fafbfd] text-xs text-slate-500">
                <th className="p-3 text-right">
                  البداية
                </th>

                <th className="p-3 text-right">
                  النهاية
                </th>

                <th className="p-3 text-right">
                  المدة
                </th>

                <th className="p-3 text-right">
                  الملاحظات
                </th>

                <th className="p-3 text-right">
                  إجراء
                </th>
              </tr>
            </thead>

            <tbody>
              {activeSessions.map(
                (session) => (
                  <tr
                    key={
                      session.id
                    }
                    className="border-b last:border-0"
                  >
                    <td className="p-3 text-sm text-slate-600">
                      {formatDateTime(
                        session.startAt,
                      )}
                    </td>

                    <td className="p-3 text-sm text-slate-600">
                      {formatDateTime(
                        session.endAt,
                      )}
                    </td>

                    <td className="p-3 font-black text-[#123b69]">
                      {formatMinutes(
                        session.durationMinutes,
                      )}
                    </td>

                    <td className="p-3 text-sm text-slate-500">
                      {session.notes ||
                        "—"}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        disabled={
                          deletingId ===
                          session.id
                        }
                        onClick={() =>
                          deleteSession(
                            session.id,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2
                          size={15}
                        />
                        أرشفة
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {archivedSessions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-[#17385f]">
                الجلسات المؤرشفة
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                لا تدخل في الوقت المستهلك، ويمكن استرجاعها إذا كان الرصيد يسمح ولا يوجد تعارض.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
              {archivedSessions.length.toLocaleString("ar-EG")} مؤرشف
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {archivedSessions.map(
              (session) => (
                <div
                  key={
                    session.id
                  }
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-bold text-[#17385f]">
                      {formatDateTime(
                        session.startAt,
                      )}{" "}
                      →{" "}
                      {formatDateTime(
                        session.endAt,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatMinutes(
                        session.durationMinutes,
                      )}{" "}
                      • أُرشفت{" "}
                      {formatDateTime(
                        session.archivedAt,
                      )}
                      {session.notes
                        ? ` • ${session.notes}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      restoringId ===
                      session.id
                    }
                    onClick={() =>
                      restoreSession(
                        session.id,
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <RotateCcw
                      size={15}
                    />

                    {restoringId ===
                    session.id
                      ? "جاري الاسترجاع..."
                      : "استرجاع"}
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      )}

    </section>
  );
}

function UsageMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-4">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-[#102f55]">
        {value}
      </p>
    </div>
  );
}
