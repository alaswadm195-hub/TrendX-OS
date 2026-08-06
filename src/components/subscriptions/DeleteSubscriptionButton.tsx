"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteSubscriptionButton({
  id,
}: {
  id: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = confirm(
      "هل تريد حذف الاشتراك؟"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/subscriptions/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      router.refresh();
    } catch (error) {
      console.error(error);

      alert("حدث خطأ أثناء الحذف");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:text-red-700"
    >
      <Trash2 size={18} />
    </button>
  );
}