"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

export type DashboardTask = {
  id: string;
  title: string;
  clientName: string;
  employeeName: string;
  dueDate: string;
  status:
    | "TODO"
    | "IN_PROGRESS"
    | "REVIEW"
    | "DONE"
    | "CANCELLED";
  priority:
    | "URGENT"
    | "ON_TIME";
};

type Props = {
  tasks?: DashboardTask[];
};

const statusLabels: Record<
  DashboardTask["status"],
  string
> = {
  TODO: "جديدة",
  IN_PROGRESS: "قيد التنفيذ",
  REVIEW: "مراجعة",
  DONE: "مكتملة",
  CANCELLED: "ملغاة",
};

const statusClasses: Record<
  DashboardTask["status"],
  string
> = {
  TODO:
    "bg-slate-100 text-slate-600 border-slate-200",
  IN_PROGRESS:
    "bg-blue-50 text-blue-700 border-blue-100",
  REVIEW:
    "bg-violet-50 text-violet-700 border-violet-100",
  DONE:
    "bg-emerald-50 text-emerald-700 border-emerald-100",
  CANCELLED:
    "bg-red-50 text-red-700 border-red-100",
};

function formatDueDate(
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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

export default function TasksCard({
  tasks = [],
}: Props) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(15,47,85,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#edf1f5] p-5 md:p-6">
        <div>
          <h2 className="text-xl font-black text-[#102f55]">
            المهام النشطة
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-500">
            آخر المهام الجاري العمل
            عليها
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-[#f2d0ad] bg-[#fff8f1] px-3 py-1 text-xs font-black text-[#d96d1d]">
          {tasks.length.toLocaleString(
            "ar-EG",
          )}{" "}
          مهام
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f8fc] text-[#17385f]">
              <CheckCircle2 size={26} />
            </div>

            <p className="mt-4 font-bold text-[#17385f]">
              لا توجد مهام نشطة
            </p>

            <p className="mt-1 text-sm text-slate-400">
              المهام الجديدة ستظهر هنا
              تلقائيًا
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {tasks.map((task) => {
            const urgent =
              task.priority ===
              "URGENT";

            return (
              <div
                key={task.id}
                className="rounded-2xl border border-[#e7edf4] bg-[#fbfcfe] p-4 transition hover:border-[#d9e3ee] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-black text-[#17385f]">
                      {task.title}
                    </h3>

                    <p className="mt-1 truncate text-sm font-medium text-slate-500">
                      العميل:{" "}
                      <span className="text-slate-700">
                        {
                          task.clientName
                        }
                      </span>
                    </p>
                  </div>

                  {urgent ? (
                    <div
                      title="مهمة عاجلة"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"
                    >
                      <AlertTriangle
                        size={18}
                      />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f8fc] text-[#17385f]">
                      <Clock3
                        size={18}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs font-medium text-slate-500">
                  <p>
                    الموظف:{" "}
                    <span className="font-bold text-[#17385f]">
                      {
                        task.employeeName
                      }
                    </span>
                  </p>

                  <p>
                    التسليم:{" "}
                    <span className="font-bold text-[#17385f]">
                      {formatDueDate(
                        task.dueDate,
                      )}
                    </span>
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold ${
                      statusClasses[
                        task.status
                      ]
                    }`}
                  >
                    {
                      statusLabels[
                        task.status
                      ]
                    }
                  </span>

                  {urgent && (
                    <span className="text-[11px] font-black text-red-600">
                      عاجلة
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-[#edf1f5] p-4">
        <Link
          href="/tasks"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5f8fc] px-4 py-3 text-sm font-bold text-[#17385f] transition hover:bg-[#edf3f9]"
        >
          عرض كل المهام
          <ArrowLeft size={17} />
        </Link>
      </div>
    </div>
  );
}
