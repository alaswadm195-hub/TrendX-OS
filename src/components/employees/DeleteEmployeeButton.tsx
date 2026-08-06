"use client";

import { useRouter } from "next/navigation";

export default function DeleteEmployeeButton({
  employeeId,
}: {
  employeeId: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed =
      confirm(
        "هل أنت متأكد من حذف الموظف؟"
      );

    if (!confirmed) return;

    const res = await fetch(
      `/api/employees/${employeeId}`,
      {
        method: "DELETE",
      }
    );

    if (res.ok) {
      router.refresh();
    } else {
      alert("فشل الحذف");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:text-red-700 font-medium"
    >
      حذف
    </button>
  );
}