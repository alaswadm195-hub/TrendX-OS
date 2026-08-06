"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TaskStatusSelect({
  taskId,
  currentStatus,
}: {
  taskId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  const [status, setStatus] =
    useState(currentStatus);

  async function updateStatus(
    value: string
  ) {
    setStatus(value);

    await fetch(
      `/api/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          status: value,
        }),
      }
    );

    router.refresh();
  }

  return (
    <select
      value={status}
      onChange={(e) =>
        updateStatus(
          e.target.value
        )
      }
      className="border rounded-lg px-2 py-1 text-sm"
    >
      <option value="TODO">
        قيد الانتظار
      </option>

      <option value="IN_PROGRESS">
        جاري التنفيذ
      </option>

      <option value="REVIEW">
        للمراجعة
      </option>

      <option value="DONE">
        مكتملة
      </option>

      <option value="CANCELLED">
        ملغية
      </option>
    </select>
  );
}