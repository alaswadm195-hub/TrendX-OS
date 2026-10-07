import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import AddTaskModal from "@/components/tasks/AddTaskModal";
import TasksTable from "@/components/tasks/TasksTable";

export default async function TasksPage() {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const taskWhere =
    currentUser.role === "ADMIN"
      ? {}
      : {
          employeeId:
            currentUser.employeeId!,
        };

  const [tasks, employees, clients] =
    await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        include: {
          employee: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
          client: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      currentUser.role === "ADMIN" ? prisma.employee.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: {
          createdAt: "desc",
        },
      }) : Promise.resolve([]),

      currentUser.role === "ADMIN" ? prisma.client.findMany({
        orderBy: {
          name: "asc",
        },
      }) : Promise.resolve([]),
    ]);

  const totalTasks = tasks.length;

  const completedTasks =
    tasks.filter(
      (task) => task.status === "DONE"
    ).length;

  const inProgressTasks =
    tasks.filter(
      (task) =>
        task.status ===
        "IN_PROGRESS"
    ).length;

  const pendingTasks =
    tasks.filter(
      (task) =>
        task.status === "TODO"
    ).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            المهام
          </h1>

          <p className="text-slate-500 mt-2">
            إدارة ومتابعة المهام
          </p>
        </div>

        {currentUser.role ===
          "ADMIN" && (
          <AddTaskModal
            employees={
              employees
            }
            clients={clients}
          />
        )}
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي المهام
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {totalTasks}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            قيد الانتظار
          </p>

          <h3 className="text-3xl font-bold mt-2 text-orange-600">
            {pendingTasks}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            جاري التنفيذ
          </p>

          <h3 className="text-3xl font-bold mt-2 text-blue-600">
            {inProgressTasks}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            مكتملة
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {completedTasks}
          </h3>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <TasksTable tasks={tasks} />
      </div>
    </div>
  );
}