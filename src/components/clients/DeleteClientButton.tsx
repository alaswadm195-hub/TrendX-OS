"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteClientButton({
  clientId,
}: {
  clientId: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = confirm(
      "هل تريد أرشفة العميل وإخفاءه من القائمة؟ سيتم الاحتفاظ بالفواتير والمدفوعات والبيانات المرتبطة به."
    );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/clients/${clientId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || data?.message || `فشل أرشفة العميل (HTTP ${res.status})`
        );
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "فشل حذف العميل"
      );
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
    >
      <Trash2 size={16} />
    </button>
  );
}