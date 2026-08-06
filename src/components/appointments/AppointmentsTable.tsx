"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AppointmentsTable({
  appointments,
}: {
  appointments: any[];
}) {
  const router = useRouter();

  const [filter, setFilter] =
    useState("TODAY");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const filteredAppointments =
    useMemo(() => {
      return appointments.filter(
        (appointment) => {
          const date = new Date(
            appointment.appointmentDate
          );

          switch (filter) {
            case "TODAY":
              return (
                date.toDateString() ===
                today.toDateString()
              );

            case "UPCOMING":
              return (
                date >= tomorrow
              );

            case "PENDING":
              return (
                appointment.status ===
                "PENDING"
              );

            case "COMPLETED":
              return (
                appointment.status ===
                "COMPLETED"
              );

            default:
              return true;
          }
        }
      );
    }, [appointments, filter]);

  async function deleteAppointment(
    id: string
  ) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا الموعد؟"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await fetch(
        `/api/appointments/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      router.refresh();
    } catch {
      alert("فشل حذف الموعد");
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusBadge(
    status: string
  ) {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
            في انتظار التأكيد
          </span>
        );

      case "CONFIRMED":
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
            مؤكد
          </span>
        );

      case "COMPLETED":
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
            مكتمل
          </span>
        );

      case "CANCELLED":
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700">
            ملغي
          </span>
        );

      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-slate-100">
            {status}
          </span>
        );
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 p-4 border-b">
        <button
          onClick={() =>
            setFilter("TODAY")
          }
          className={`px-4 py-2 rounded-xl ${
            filter === "TODAY"
              ? "bg-blue-600 text-white"
              : "bg-slate-100"
          }`}
        >
          مواعيد اليوم
        </button>

        <button
          onClick={() =>
            setFilter("UPCOMING")
          }
          className={`px-4 py-2 rounded-xl ${
            filter === "UPCOMING"
              ? "bg-blue-600 text-white"
              : "bg-slate-100"
          }`}
        >
          القادمة
        </button>

        <button
          onClick={() =>
            setFilter("PENDING")
          }
          className={`px-4 py-2 rounded-xl ${
            filter === "PENDING"
              ? "bg-orange-600 text-white"
              : "bg-slate-100"
          }`}
        >
          انتظار التأكيد
        </button>

        <button
          onClick={() =>
            setFilter("COMPLETED")
          }
          className={`px-4 py-2 rounded-xl ${
            filter === "COMPLETED"
              ? "bg-green-600 text-white"
              : "bg-slate-100"
          }`}
        >
          المكتملة
        </button>

        <button
          onClick={() =>
            setFilter("ALL")
          }
          className={`px-4 py-2 rounded-xl ${
            filter === "ALL"
              ? "bg-slate-900 text-white"
              : "bg-slate-100"
          }`}
        >
          الكل
        </button>
      </div>

      {filteredAppointments.length ===
      0 ? (
        <div className="p-10 text-center text-slate-500">
          لا توجد مواعيد
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 text-right">
                الموعد
              </th>

              <th className="p-4 text-right">
                العميل
              </th>

              <th className="p-4 text-right">
                الموظف
              </th>

              <th className="p-4 text-right">
                التاريخ
              </th>

              <th className="p-4 text-right">
                الحالة
              </th>

              <th className="p-4 text-right">
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredAppointments.map(
              (appointment) => (
                <tr
                  key={
                    appointment.id
                  }
                  className="border-b hover:bg-slate-50"
                >
                  <td className="p-4">
                    <Link
                      href={`/appointments/${appointment.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {
                        appointment.title
                      }
                    </Link>
                  </td>

                  <td className="p-4">
                    {appointment
                      .client?.name ||
                      "-"}
                  </td>

                  <td className="p-4">
                    {appointment
                      .employee?.user
                      ?.name || "-"}
                  </td>

                  <td className="p-4">
                    {new Date(
                      appointment.appointmentDate
                    ).toLocaleString(
                      "ar-EG"
                    )}
                  </td>

                  <td className="p-4">
                    {getStatusBadge(
                      appointment.status
                    )}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() =>
                        deleteAppointment(
                          appointment.id
                        )
                      }
                      disabled={
                        deletingId ===
                        appointment.id
                      }
                      className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId ===
                      appointment.id
                        ? "جاري الحذف..."
                        : "حذف"}
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </>
  );
}