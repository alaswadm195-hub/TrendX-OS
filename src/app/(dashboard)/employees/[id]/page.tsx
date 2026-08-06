import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } =
    await params;

  const employee =
    await prisma.employee.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        tasks: true,
        appointments: true,
      },
    });

  if (!employee) {
    notFound();
  }

  const completedTasks =
    employee.tasks.filter(
      (task) =>
        task.status === "DONE"
    ).length;

  const pendingTasks =
    employee.tasks.filter(
      (task) =>
        task.status !== "DONE"
    ).length;

  const completionRate =
    employee.tasks.length > 0
      ? Math.round(
          (completedTasks /
            employee.tasks.length) *
            100
        )
      : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {employee.user.name}
          </h1>

          <p className="text-slate-500 mt-2">
            تفاصيل الموظف
          </p>
        </div>

        <Link
          href="/employees"
          className="border px-4 py-2 rounded-xl"
        >
          رجوع
        </Link>
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي المهام
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {employee.tasks.length}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            المهام المكتملة
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {completedTasks}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            المهام المفتوحة
          </p>

          <h3 className="text-3xl font-bold mt-2 text-orange-600">
            {pendingTasks}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            نسبة الإنجاز
          </p>

          <h3 className="text-3xl font-bold mt-2 text-blue-600">
            {completionRate}%
          </h3>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">
            بيانات الموظف
          </h2>

          <div className="space-y-3">
            <p>
              <strong>الاسم:</strong>{" "}
              {employee.user.name}
            </p>

            <p>
              <strong>البريد:</strong>{" "}
              {employee.user.email}
            </p>

            <p>
              <strong>الهاتف:</strong>{" "}
              {employee.phone || "-"}
            </p>

            <p>
              <strong>الوظيفة:</strong>{" "}
              {employee.position || "-"}
            </p>

            <p>
              <strong>الراتب:</strong>{" "}
              {employee.salary?.toLocaleString() ||
                0}{" "}
              ج
            </p>

            <p>
              <strong>العنوان:</strong>{" "}
              {employee.address || "-"}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">
            المواعيد
          </h2>

          {employee.appointments
            .length === 0 ? (
            <p className="text-slate-500">
              لا توجد مواعيد
            </p>
          ) : (
            <div className="space-y-3">
              {employee.appointments.map(
                (
                  appointment
                ) => (
                  <div
                    key={
                      appointment.id
                    }
                    className="border rounded-xl p-3"
                  >
                    <p className="font-medium">
                      {
                        appointment.status
                      }
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">
          المهام
        </h2>

        {employee.tasks.length ===
        0 ? (
          <p className="text-slate-500">
            لا توجد مهام
          </p>
        ) : (
          <div className="space-y-3">
            {employee.tasks.map(
              (task) => (
                <div
                  key={task.id}
                  className="border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium">
                      {task.title}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {task.description ||
                        "بدون وصف"}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      task.status ===
                      "DONE"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}