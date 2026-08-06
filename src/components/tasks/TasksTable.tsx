"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TaskStatusSelect from "./TaskStatusSelect";

export default function TasksTable({
  tasks,
}: {
  tasks: any[];
}) {
  const [filter, setFilter] = useState("TODAY");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const afterTomorrow = new Date(tomorrow);
  afterTomorrow.setDate(afterTomorrow.getDate() + 1);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      switch (filter) {
        case "TODAY":
          return dueDate.getTime() === today.getTime();

        case "UPCOMING":
          return dueDate >= tomorrow;

        case "OVERDUE":
          return (
            dueDate < today &&
            task.status !== "DONE"
          );

        case "DONE":
          return task.status === "DONE";

        default:
          return true;
      }
    });
  }, [tasks, filter]);

  return (
    <>
      <div className="flex flex-wrap gap-3 p-4 border-b">
        <button
          onClick={() => setFilter("TODAY")}
          className={`px-4 py-2 rounded-xl ${
            filter === "TODAY"
              ? "bg-blue-600 text-white"
              : "bg-slate-100"
          }`}
        >
          مهام اليوم
        </button>

        <button
          onClick={() => setFilter("UPCOMING")}
          className={`px-4 py-2 rounded-xl ${
            filter === "UPCOMING"
              ? "bg-blue-600 text-white"
              : "bg-slate-100"
          }`}
        >
          المهام القادمة
        </button>

        <button
          onClick={() => setFilter("OVERDUE")}
          className={`px-4 py-2 rounded-xl ${
            filter === "OVERDUE"
              ? "bg-red-600 text-white"
              : "bg-slate-100"
          }`}
        >
          المهام المتأخرة
        </button>

        <button
          onClick={() => setFilter("DONE")}
          className={`px-4 py-2 rounded-xl ${
            filter === "DONE"
              ? "bg-green-600 text-white"
              : "bg-slate-100"
          }`}
        >
          المكتملة
        </button>

        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-xl ${
            filter === "ALL"
              ? "bg-slate-900 text-white"
              : "bg-slate-100"
          }`}
        >
          الكل
        </button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          لا توجد مهام
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 text-right">
                المهمة
              </th>

              <th className="p-4 text-right">
                العميل
              </th>

              <th className="p-4 text-right">
                الموظف
              </th>

              <th className="p-4 text-right">
                الأولوية
              </th>

              <th className="p-4 text-right">
                تاريخ التسليم
              </th>

              <th className="p-4 text-right">
                الحالة
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredTasks.map((task) => {
              const dueDate = new Date(
                task.dueDate
              );

              const isOverdue =
                dueDate < today &&
                task.status !== "DONE";

              return (
                <tr
                  key={task.id}
                  className={`border-b ${
                    isOverdue
                      ? "bg-red-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="p-4">
                    <div>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {task.title}
                      </Link>

                      <p className="text-sm text-slate-500">
                        {task.description ||
                          "بدون وصف"}
                      </p>
                    </div>
                  </td>

                  <td className="p-4">
                    {task.client?.name || "-"}
                  </td>

                  <td className="p-4">
                    {task.employee?.user
                      ?.name || "-"}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        task.priority ===
                        "URGENT"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {task.priority ===
                      "URGENT"
                        ? "مستعجل 🔥"
                        : "تسليم في معاده"}
                    </span>
                  </td>

                  <td className="p-4">
                    {dueDate.toLocaleDateString(
                      "ar-EG"
                    )}
                  </td>

                  <td className="p-4">
                    <TaskStatusSelect
                      taskId={task.id}
                      currentStatus={
                        task.status
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}