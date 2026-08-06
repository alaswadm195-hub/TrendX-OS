"use client";

import { useRouter } from "next/navigation";

export default function TaskWorkflowActions({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const router = useRouter();

  async function runAction(
    action: string
  ) {
    await fetch(
      `/api/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      }
    );

    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "TODO" && (
        <button
          onClick={() =>
            runAction("START")
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          ▶ بدء التنفيذ
        </button>
      )}

      {status ===
        "IN_PROGRESS" && (
        <button
          onClick={() =>
            runAction(
              "SUBMIT_REVIEW"
            )
          }
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          📤 إرسال للمراجعة
        </button>
      )}

      {status === "REVIEW" && (
        <>
          <button
            onClick={() =>
              runAction(
                "APPROVE"
              )
            }
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            ✅ اعتماد المهمة
          </button>

          <button
            onClick={() =>
              runAction(
                "RETURN"
              )
            }
            className="px-4 py-2 bg-orange-600 text-white rounded-lg"
          >
            ↩ إعادة للتنفيذ
          </button>
        </>
      )}
    </div>
  );
}