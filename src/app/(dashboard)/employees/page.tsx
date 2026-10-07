import Link from "next/link";

import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import EditEmployeeModal from "@/components/employees/EditEmployeeModal";
import DeleteEmployeeButton from "@/components/employees/DeleteEmployeeButton";

type MoneyValue =
  | number
  | {
      toString(): string;
    };

function moneyToNumber(
  value: MoneyValue,
) {
  const numericValue =
    typeof value === "number"
      ? value
      : Number(value.toString());

  if (!Number.isFinite(numericValue)) {
    throw new Error(
      "Invalid monetary value",
    );
  }

  return numericValue;
}

function toCents(
  value: MoneyValue,
) {
  const numericValue =
    moneyToNumber(value);

  const cents =
    Math.round(
      numericValue * 100,
    );

  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      "Monetary value is out of range",
    );
  }

  return cents;
}

function fromCents(
  cents: number,
) {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      "Monetary total is out of range",
    );
  }

  return cents / 100;
}

export default async function EmployeesPage() {
  await requireAdmin();

  const rawEmployees =
    await prisma.employee.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        _count: {
          select: {
            tasks: true,
            appointments: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  /*
   * Salary is currently Float and is planned to become Decimal.
   * Normalize it to a plain number before calculations and before passing
   * employee data to client components.
   */
  const employees =
    rawEmployees.map(
      (employee) => ({
        ...employee,

        salary:
          employee.salary === null
            ? null
            : moneyToNumber(
                employee.salary,
              ),
      }),
    );

  const totalEmployees =
    employees.length;

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.status ===
        "ACTIVE",
    ).length;

  const vacationEmployees =
    employees.filter(
      (employee) =>
        employee.status ===
        "VACATION",
    ).length;

  /*
   * Aggregate salaries in integer cents so the result remains safe before
   * and after the Float -> Decimal migration.
   */
  const totalSalariesCents =
    employees.reduce(
      (sum, employee) =>
        sum +
        (employee.salary === null
          ? 0
          : toCents(
              employee.salary,
            )),
      0,
    );

  const totalSalaries =
    fromCents(
      totalSalariesCents,
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
            {totalSalaries.toLocaleString(
              "ar-EG",
            )}{" "}
            ج
          </h3>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            قائمة الموظفين
          </h2>
        </div>

        {employees.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            لا يوجد موظفين حتى الآن
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
                    (employee) => (
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
                          {(
                            employee.salary ??
                            0
                          ).toLocaleString(
                            "ar-EG",
                          )}{" "}
                          ج
                        </td>

                        <td className="p-4">
                          {
                            employee
                              ._count
                              .tasks
                          }
                        </td>

                        <td className="p-4">
                          {
                            employee
                              ._count
                              .appointments
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
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden p-4 space-y-4">
              {employees.map(
                (employee) => (
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
                        {(
                          employee.salary ??
                          0
                        ).toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ج
                      </p>

                      <p>
                        المهام:{" "}
                        {
                          employee
                            ._count
                            .tasks
                        }
                      </p>

                      <p>
                        المواعيد:{" "}
                        {
                          employee
                            ._count
                            .appointments
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
                ),
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
