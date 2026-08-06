import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import EditEmployeeModal from "@/components/employees/EditEmployeeModal";
import DeleteEmployeeButton from "@/components/employees/DeleteEmployeeButton";

export default async function EmployeesPage() {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (
    currentUser.role !==
    "ADMIN"
  ) {
    redirect("/tasks");
  }

  const employees =
    await prisma.employee.findMany({
      include: {
        user: true,
        tasks: true,
        appointments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const totalEmployees =
    employees.length;

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.status ===
        "ACTIVE"
    ).length;

  const vacationEmployees =
    employees.filter(
      (employee) =>
        employee.status ===
        "VACATION"
    ).length;

  const totalSalaries =
    employees.reduce(
      (sum, employee) =>
        sum +
        (employee.salary || 0),
      0
    );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            الموظفين
          </h1>

          <p className="text-slate-500 mt-2">
            إدارة فريق العمل بالكامل
          </p>
        </div>

        <AddEmployeeModal />
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي الموظفين
          </p>

          <h3 className="text-3xl font-bold mt-2">
            {totalEmployees}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            الموظفين النشطين
          </p>

          <h3 className="text-3xl font-bold mt-2 text-green-600">
            {activeEmployees}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            في إجازة
          </p>

          <h3 className="text-3xl font-bold mt-2 text-orange-600">
            {vacationEmployees}
          </h3>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            إجمالي الرواتب
          </p>

          <h3 className="text-3xl font-bold mt-2 text-blue-600">
            {totalSalaries.toLocaleString()} ج
          </h3>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            قائمة الموظفين
          </h2>
        </div>

        {employees.length ===
        0 ? (
          <div className="p-10 text-center text-slate-500">
            لا يوجد موظفين حتى
            الآن
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-right p-4">
                      الاسم
                    </th>

                    <th className="text-right p-4">
                      الوظيفة
                    </th>

                    <th className="text-right p-4">
                      الهاتف
                    </th>

                    <th className="text-right p-4">
                      الراتب
                    </th>

                    <th className="text-right p-4">
                      المهام
                    </th>

                    <th className="text-right p-4">
                      المواعيد
                    </th>

                    <th className="text-right p-4">
                      الحالة
                    </th>

                    <th className="text-right p-4">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map(
                    (
                      employee
                    ) => (
                      <tr
                        key={
                          employee.id
                        }
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="p-4 font-medium">
                          {
                            employee
                              .user
                              .name
                          }
                        </td>

                        <td className="p-4">
                          {employee.position ||
                            "-"}
                        </td>

                        <td className="p-4">
                          {employee.phone ||
                            "-"}
                        </td>

                        <td className="p-4">
                          {employee.salary?.toLocaleString() ||
                            0}{" "}
                          ج
                        </td>

                        <td className="p-4">
                          {
                            employee
                              .tasks
                              .length
                          }
                        </td>

                        <td className="p-4">
                          {
                            employee
                              .appointments
                              .length
                          }
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              employee.status ===
                              "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : employee.status ===
                                    "VACATION"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {employee.status ===
                            "ACTIVE"
                              ? "نشط"
                              : employee.status ===
                                  "VACATION"
                                ? "إجازة"
                                : "موقوف"}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/employees/${employee.id}`}
                              className="text-green-600 hover:text-green-700 font-medium"
                            >
                              عرض
                            </Link>

                            <EditEmployeeModal
                              employee={
                                employee
                              }
                            />

                            <DeleteEmployeeButton
                              employeeId={
                                employee.id
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden p-4 space-y-4">
              {employees.map(
                (
                  employee
                ) => (
                  <div
                    key={
                      employee.id
                    }
                    className="border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">
                        {
                          employee
                            .user
                            .name
                        }
                      </h3>

                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          employee.status ===
                          "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : employee.status ===
                                "VACATION"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {employee.status ===
                        "ACTIVE"
                          ? "نشط"
                          : employee.status ===
                              "VACATION"
                            ? "إجازة"
                            : "موقوف"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p>
                        الوظيفة:{" "}
                        {employee.position ||
                          "-"}
                      </p>

                      <p>
                        الهاتف:{" "}
                        {employee.phone ||
                          "-"}
                      </p>

                      <p>
                        الراتب:{" "}
                        {employee.salary?.toLocaleString() ||
                          0}{" "}
                        ج
                      </p>

                      <p>
                        المهام:{" "}
                        {
                          employee
                            .tasks
                            .length
                        }
                      </p>

                      <p>
                        المواعيد:{" "}
                        {
                          employee
                            .appointments
                            .length
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                      <Link
                        href={`/employees/${employee.id}`}
                        className="text-green-600 font-medium"
                      >
                        عرض
                      </Link>

                      <EditEmployeeModal
                        employee={
                          employee
                        }
                      />

                      <DeleteEmployeeButton
                        employeeId={
                          employee.id
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}