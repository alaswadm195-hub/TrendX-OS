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
      "هل أنت متأكد من حذف العميل؟"
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
        throw new Error();
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("فشل حذف العميل");
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