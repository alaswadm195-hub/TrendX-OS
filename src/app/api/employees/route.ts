import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";

import {
  ApiError,
  apiError,
  assertSameOrigin,
  requireApiAdmin,
  safeUserSelect,
} from "@/lib/api-security";

import {
  employeeCreateSchema,
  parseJson,
} from "@/lib/validation";

type MoneyValue =
  | number
  | {
      toString(): string;
    };

const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

function moneyToNumber(
  value: MoneyValue,
) {
  const numericValue =
    typeof value === "number"
      ? value
      : Number(value.toString());

  if (!Number.isFinite(numericValue)) {
    throw new ApiError(
      500,
      "Invalid monetary value",
    );
  }

  return numericValue;
}

function serializeSalary<
  T extends {
    salary:
      | MoneyValue
      | null;
  },
>(
  employee: T,
) {
  return {
    ...employee,

    salary:
      employee.salary === null
        ? null
        : moneyToNumber(
            employee.salary,
          ),
  };
}

function truncateOptional(
  value: string | null | undefined,
  maxLength: number,
) {
  if (!value) {
    return null;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(
    0,
    maxLength,
  );
}

function isUniqueConstraintError(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as {
      code?: unknown;
    }).code === "P2002"
  );
}

export async function GET() {
  try {
    await requireApiAdmin();

    const rawEmployees =
      await prisma.employee.findMany({
        where: {
          archivedAt: null,
        },

        include: {
          user: {
            select:
              safeUserSelect,
          },

          tasks: {
            orderBy: {
              createdAt:
                "desc",
            },
          },

          appointments: {
            orderBy: {
              appointmentDate:
                "desc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const employees =
      rawEmployees.map(
        (employee) =>
          serializeSalary(
            employee,
          ),
      );

    return NextResponse.json(
      employees,
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(
      error,
      "Failed to fetch employees",
    );
  }
}

export async function POST(
  req: Request,
) {
  try {
    assertSameOrigin(req);

    const admin =
      await requireApiAdmin();

    const body =
      await parseJson(
        req,
        employeeCreateSchema,
      );

    /*
     * Fast duplicate check for a clean 409 response.
     * The database unique constraint remains the final source of truth
     * and is handled below to cover concurrent requests.
     */
    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: body.email,
        },

        select: {
          id: true,
        },
      });

    if (existingUser) {
      throw new ApiError(
        409,
        "Email already exists",
      );
    }

    const passwordHash =
      await hashPassword(
        body.password,
      );

    const ipAddress =
      truncateOptional(
        getClientIp(req),
        MAX_IP_LENGTH,
      );

    const userAgent =
      truncateOptional(
        req.headers.get(
          "user-agent",
        ),
        MAX_USER_AGENT_LENGTH,
      );

    try {
      /*
       * User creation, nested Employee creation, and AuditLog creation are
       * committed atomically. If any write fails, none of them are persisted.
       */
      const user =
        await prisma.$transaction(
          async (tx) => {
            const createdUser =
              await tx.user.create({
                data: {
                  name:
                    body.name,

                  email:
                    body.email,

                  passwordHash,

                  role:
                    "EMPLOYEE",

                  employee: {
                    create: {
                      phone:
                        body.phone ||
                        null,

                      position:
                        body.position ||
                        null,

                      salary:
                        body.salary ??
                        null,

                      address:
                        body.address ||
                        null,

                      hireDate:
                        body.hireDate
                          ? new Date(
                              body.hireDate,
                            )
                          : null,

                      status:
                        body.status ||
                        "ACTIVE",
                    },
                  },
                },

                select: {
                  ...safeUserSelect,

                  employee: {
                    select: {
                      id: true,
                      userId: true,
                      phone: true,
                      position: true,
                      salary: true,
                      address: true,
                      hireDate: true,
                      status: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                  },
                },
              });

            if (!createdUser.employee) {
              throw new ApiError(
                500,
                "Employee profile was not created",
              );
            }

            await tx.auditLog.create({
              data: {
                actorUserId:
                  admin.userId,

                action:
                  "EMPLOYEE_CREATE",

                entityType:
                  "Employee",

                entityId:
                  createdUser.employee.id,

                metadata: {
                  userId:
                    createdUser.id,

                  role:
                    createdUser.role,

                  status:
                    createdUser.employee.status,

                  position:
                    createdUser.employee.position,

                  salary:
                    createdUser.employee.salary ===
                    null
                      ? null
                      : moneyToNumber(
                          createdUser.employee.salary,
                        ),

                  hireDate:
                    createdUser.employee.hireDate
                      ? createdUser.employee.hireDate.toISOString()
                      : null,

                  hasPhone:
                    Boolean(
                      createdUser.employee.phone,
                    ),

                  hasAddress:
                    Boolean(
                      createdUser.employee.address,
                    ),
                },

                ipAddress,
                userAgent,
              },
            });

            return createdUser;
          },
        );

      const serializedUser = {
        ...user,

        employee:
          user.employee
            ? serializeSalary(
                user.employee,
              )
            : null,
      };

      return NextResponse.json(
        serializedUser,
        {
          status: 201,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    } catch (error) {
      /*
       * Covers the race where two admin requests pass the preliminary
       * duplicate check at the same time.
       */
      if (
        isUniqueConstraintError(
          error,
        )
      ) {
        throw new ApiError(
          409,
          "Email already exists",
        );
      }

      throw error;
    }
  } catch (error) {
    return apiError(
      error,
      "Failed to create employee",
    );
  }
}
