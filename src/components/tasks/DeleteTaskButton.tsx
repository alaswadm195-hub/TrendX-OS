"use client";

import { useRouter } from "next/navigation";

export default function DeleteTaskButton({
  taskId,
}: {
  taskId: string;
}) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف المهمة؟"
    );

    if (!confirmed) return;

    const res = await fetch(
      `/api/tasks/${taskId}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      alert("فشل حذف المهمة");
      return;
    }

    router.push("/tasks");
    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
    >
      حذف المهمة
    </button>
  );
}