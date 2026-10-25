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
      "هل تريد إلغاء قيد الباقة لأنه أُدخل بالخطأ؟ ستُستبعد قيمته ودفعاته وإضافاته من تقارير التشغيل، لكن سيبقى سجل العملية محفوظًا للمراجعة. هذا لا يرد أموالًا للعميل."
    );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/subscriptions/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || result?.message || "تعذر إلغاء الباقة");
      }
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(error instanceof Error ? error.message : "حدث خطأ أثناء الحذف");
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