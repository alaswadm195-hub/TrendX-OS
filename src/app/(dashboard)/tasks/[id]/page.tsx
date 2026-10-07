import { requireAuth } from "@/lib/guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TaskWorkflowActions from "@/components/tasks/TaskWorkflowActions";
import DeleteTaskButton from "@/components/tasks/DeleteTaskButton";

export default async function TaskDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const currentUser = await requireAuth();

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: {
      id,
    },
    include: {
      client: true,
      employee: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      activities: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!task) {
    notFound();
  }

  if (currentUser.role !== "ADMIN" && task.employeeId !== currentUser.employeeId) {
    notFound();
  }

  const statusMap = {
    TODO: "قيد الانتظار",
    IN_PROGRESS: "جاري التنفيذ",
    REVIEW: "للمراجعة",
    DONE: "مكتملة",
    CANCELLED: "ملغية",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/tasks"
            className="text-blue-600 hover:underline"
          >
            ← الرجوع للمهام
          </Link>

          <h1 className="text-3xl font-bold mt-3">
            {task.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <TaskWorkflowActions
            taskId={task.id}
            status={task.status}
          />

          <DeleteTaskButton
            taskId={task.id}
          />
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              task.status === "DONE"
                ? "bg-green-100 text-green-700"
                : task.status === "IN_PROGRESS"
                ? "bg-blue-100 text-blue-700"
                : task.status === "REVIEW"
                ? "bg-purple-100 text-purple-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {statusMap[task.status]}
          </span>

          <span
            className={`px-3 py-1 rounded-full text-sm ${
              task.priority === "URGENT"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {task.priority === "URGENT"
              ? "🔥 مستعجل"
              : "✅ تسليم في معاده"}
          </span>
        </div>

        <p className="text-slate-600">
          {task.description || "بدون وصف"}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">
            بيانات المهمة
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">
                العميل
              </p>

              <p className="font-medium">
                {task.client.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                الموظف
              </p>

              <p className="font-medium">
                {task.employee.user.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                تاريخ التسليم
              </p>

              <p className="font-medium">
                {new Date(
                  task.dueDate
                ).toLocaleDateString("ar-EG")}
              </p>
            </div>

            {task.fileUrl && (
              <div>
                <p className="text-sm text-slate-500">
                  الملفات
                </p>

                <a
                  href={task.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  فتح الملف
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">
            سجل النشاط
          </h2>

          <div className="space-y-5">
            {task.activities.length === 0 ? (
              <p className="text-slate-500">
                لا يوجد نشاط
              </p>
            ) : (
              task.activities.map(
                (activity) => (
                  <div
                    key={activity.id}
                    className="border-r-2 border-blue-500 pr-4"
                  >
                    <p className="font-medium">
                      {activity.action}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(
                        activity.createdAt
                      ).toLocaleString(
                        "ar-EG"
                      )}
                    </p>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}