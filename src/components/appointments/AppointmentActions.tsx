"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AppointmentActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  async function updateStatus(
    newStatus: string
  ) {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/appointments/${appointmentId}`,
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
    } catch {
      alert(
        "حدث خطأ أثناء تحديث الموعد"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {status === "PENDING" && (
        <button
          disabled={loading}
          onClick={() =>
            updateStatus(
              "CONFIRMED"
            )
          }
          className="bg-blue-600 text-white px-4 py-2 rounded-xl"
        >
          تأكيد الموعد
        </button>
      )}

      {status ===
        "CONFIRMED" && (
        <>
          <button
            disabled={loading}
            onClick={() =>
              updateStatus(
                "COMPLETED"
              )
            }
            className="bg-green-600 text-white px-4 py-2 rounded-xl"
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
            className="bg-orange-600 text-white px-4 py-2 rounded-xl"
          >
            لم يحضر
          </button>
        </>
      )}

      {status !==
        "CANCELLED" &&
        status !==
          "COMPLETED" && (
          <button
            disabled={loading}
            onClick={() =>
              updateStatus(
                "CANCELLED"
              )
            }
            className="bg-red-600 text-white px-4 py-2 rounded-xl"
          >
            إلغاء الموعد
          </button>
        )}
    </div>
  );
}