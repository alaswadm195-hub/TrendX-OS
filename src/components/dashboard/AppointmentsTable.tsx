"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";

export type DashboardAppointment = {
  id: string;
  title: string;
  clientName: string;
  employeeName: string;
  appointmentDate: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW";
};

type Props = {
  appointments?: DashboardAppointment[];
  canManage?: boolean;
};

const statusLabels: Record<
  DashboardAppointment["status"],
  string
> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  COMPLETED: "تم",
  CANCELLED: "ملغي",
  NO_SHOW: "لم يحضر",
};

const statusClasses: Record<
  DashboardAppointment["status"],
  string
> = {
  PENDING:
    "bg-amber-50 text-amber-700 border-amber-100",
  CONFIRMED:
    "bg-blue-50 text-blue-700 border-blue-100",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 border-emerald-100",
  CANCELLED:
    "bg-red-50 text-red-700 border-red-100",
  NO_SHOW:
    "bg-slate-100 text-slate-600 border-slate-200",
};

function formatTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      timeZone:
        "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default function AppointmentsTable({
  appointments = [],
  canManage = false,
}: Props) {
  const router =
    useRouter();

  const [
    updatingId,
    setUpdatingId,
  ] = useState<string | null>(
    null,
  );

  const [error, setError] =
    useState("");

  async function markCompleted(
    appointmentId: string,
  ) {
    setError("");
    setUpdatingId(
      appointmentId,
    );

    try {
      const response =
        await fetch(
          `/api/appointments/${appointmentId}`,
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                status:
                  "COMPLETED",
              },
            ),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "تعذر تحديث الموعد",
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحديث الموعد",
      );
    } finally {
      setUpdatingId(
        null,
      );
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(15,47,85,0.06)]">
      <div className="border-b border-[#edf1f5] p-5 md:p-6">
        <h2 className="text-xl font-black text-[#102f55]">
          مواعيد اليوم
        </h2>

        <p className="mt-1 text-sm font-medium text-slate-500">
          المواعيد المسجلة فعليًا
          لليوم
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-5 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:mx-6">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {appointments.length ===
      0 ? (
        <div className="flex min-h-[280px] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f8fc] text-[#17385f]">
              <CalendarIcon />
            </div>

            <p className="mt-4 font-bold text-[#17385f]">
              لا توجد مواعيد اليوم
            </p>

            <p className="mt-1 text-sm text-slate-400">
              أي موعد جديد سيظهر هنا
              تلقائيًا
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#edf1f5] bg-[#fafbfd]">
                  <th className="p-4 text-right text-xs font-bold text-slate-500">
                    العميل
                  </th>

                  <th className="p-4 text-right text-xs font-bold text-slate-500">
                    الموعد
                  </th>

                  <th className="p-4 text-right text-xs font-bold text-slate-500">
                    الموظف
                  </th>

                  <th className="p-4 text-right text-xs font-bold text-slate-500">
                    الوقت
                  </th>

                  <th className="p-4 text-right text-xs font-bold text-slate-500">
                    الحالة
                  </th>

                  {canManage && (
                    <th className="p-4 text-right text-xs font-bold text-slate-500">
                      إجراء
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {appointments.map(
                  (
                    appointment,
                  ) => {
                    const isCompleted =
                      appointment.status ===
                      "COMPLETED";

                    const isUpdating =
                      updatingId ===
                      appointment.id;

                    return (
                      <tr
                        key={
                          appointment.id
                        }
                        className="border-b border-[#f0f3f7] last:border-b-0"
                      >
                        <td className="p-4 font-bold text-[#17385f]">
                          {
                            appointment.clientName
                          }
                        </td>

                        <td className="p-4 text-sm font-medium text-slate-600">
                          {
                            appointment.title
                          }
                        </td>

                        <td className="p-4 text-sm text-slate-600">
                          {
                            appointment.employeeName
                          }
                        </td>

                        <td className="p-4 text-sm font-bold text-[#102f55]">
                          {formatTime(
                            appointment.appointmentDate,
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                              statusClasses[
                                appointment
                                  .status
                              ]
                            }`}
                          >
                            {
                              statusLabels[
                                appointment
                                  .status
                              ]
                            }
                          </span>
                        </td>

                        {canManage && (
                          <td className="p-4">
                            <button
                              type="button"
                              disabled={
                                isCompleted ||
                                isUpdating ||
                                appointment.status ===
                                  "CANCELLED" ||
                                appointment.status ===
                                  "NO_SHOW"
                              }
                              onClick={() =>
                                markCompleted(
                                  appointment.id,
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-[#123b69] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0f2f55] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <CheckCircle2
                                size={16}
                              />

                              {isUpdating
                                ? "جاري الحفظ..."
                                : isCompleted
                                  ? "مكتمل"
                                  : "تم"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 p-4 lg:hidden">
            {appointments.map(
              (
                appointment,
              ) => {
                const isCompleted =
                  appointment.status ===
                  "COMPLETED";

                const isUpdating =
                  updatingId ===
                  appointment.id;

                return (
                  <div
                    key={
                      appointment.id
                    }
                    className="rounded-2xl border border-[#e7edf4] bg-[#fbfcfe] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-[#17385f]">
                          {
                            appointment.clientName
                          }
                        </h3>

                        <p className="mt-1 text-sm font-medium text-slate-500">
                          {
                            appointment.title
                          }
                        </p>
                      </div>

                      {isCompleted ? (
                        <CheckCircle2 className="shrink-0 text-emerald-600" />
                      ) : (
                        <Clock3 className="shrink-0 text-amber-600" />
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                      <p>
                        الموظف:{" "}
                        <span className="font-semibold text-[#17385f]">
                          {
                            appointment.employeeName
                          }
                        </span>
                      </p>

                      <p>
                        الوقت:{" "}
                        <span className="font-semibold text-[#17385f]">
                          {formatTime(
                            appointment.appointmentDate,
                          )}
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                          statusClasses[
                            appointment
                              .status
                          ]
                        }`}
                      >
                        {
                          statusLabels[
                            appointment
                              .status
                          ]
                        }
                      </span>

                      {canManage && (
                        <button
                          type="button"
                          disabled={
                            isCompleted ||
                            isUpdating ||
                            appointment.status ===
                              "CANCELLED" ||
                            appointment.status ===
                              "NO_SHOW"
                          }
                          onClick={() =>
                            markCompleted(
                              appointment.id,
                            )
                          }
                          className="rounded-xl bg-[#123b69] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isUpdating
                            ? "جاري الحفظ..."
                            : isCompleted
                              ? "مكتمل"
                              : "تم"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
