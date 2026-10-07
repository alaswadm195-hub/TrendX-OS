import { NextResponse } from "next/server";

import { z } from "zod";



import { prisma } from "@/lib/prisma";

import { getClientIp } from "@/lib/rate-limit";



import {

  ApiError,

  apiError,

  assertSameOrigin,

  requireApiAdmin,

  safeUserSelect,

} from "@/lib/api-security";



import {

  employeeUpdateSchema,

  parseJson,

} from "@/lib/validation";



const employeeIdSchema =

  z.string().cuid();



const MAX_IP_LENGTH = 100;

const MAX_USER_AGENT_LENGTH = 500;



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



export async function GET(

  _: Request,

  {

    params,

  }: {

    params: Promise<{

      id: string;

    }>;

  },

) {

  try {

    await requireApiAdmin();



    const {

      id: rawId,

    } = await params;



    const parsedId =

      employeeIdSchema.safeParse(

        rawId,

      );



    if (!parsedId.success) {

      throw new ApiError(

        404,

        "Employee not found",

      );

    }



    const employee =

      await prisma.employee.findFirst({

        where: {

          id: parsedId.data,
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

      });



    if (!employee) {

      throw new ApiError(

        404,

        "Employee not found",

      );

    }



    return NextResponse.json(

      serializeSalary(

        employee,

      ),

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

      "Failed to fetch employee",

    );

  }

}



export async function PUT(

  req: Request,

  {

    params,

  }: {

    params: Promise<{

      id: string;

    }>;

  },

) {

  try {

    assertSameOrigin(req);



    const admin =

      await requireApiAdmin();



    const {

      id: rawId,

    } = await params;



    const parsedId =

      employeeIdSchema.safeParse(

        rawId,

      );



    if (!parsedId.success) {

      throw new ApiError(

        404,

        "Employee not found",

      );

    }



    const body =

      await parseJson(

        req,

        employeeUpdateSchema,

      );



    if (

      Object.keys(body)

        .length === 0

    ) {

      throw new ApiError(

        400,

        "No update fields provided",

      );

    }



    const employeeId =

      parsedId.data;



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



    /*

     * Employee update and audit writes are committed atomically.

     *

     * Phone and address values are not copied into AuditLog metadata.

     * Sensitive administrative fields such as salary and status are recorded

     * before/after because they are material business changes.

     */

    const employee =

      await prisma.$transaction(

        async (tx) => {

          const existing =

            await tx.employee.findUnique({

              where: {

                id:

                  employeeId,

              },



              select: {

                id: true,

                userId: true,

                phone: true,

                position: true,

                salary: true,

                address: true,

                hireDate: true,

                status: true,

                archivedAt: true,

              },

            });



          if (!existing) {

            throw new ApiError(

              404,

              "Employee not found",

            );

          }



          if (existing.archivedAt) {

            throw new ApiError(

              409,

              "Archived employee cannot be updated",

            );

          }



          const changedFields:

            string[] = [];



          if (

            body.phone !==

              undefined &&

            (body.phone ||

              null) !==

              existing.phone

          ) {

            changedFields.push(

              "phone",

            );

          }



          if (

            body.position !==

              undefined &&

            (body.position ||

              null) !==

              existing.position

          ) {

            changedFields.push(

              "position",

            );

          }



          if (

            body.salary !==

              undefined &&

            body.salary !==

              (existing.salary ===

              null

                ? null

                : moneyToNumber(

                    existing.salary,

                  ))

          ) {

            changedFields.push(

              "salary",

            );

          }



          if (

            body.address !==

              undefined &&

            (body.address ||

              null) !==

              existing.address

          ) {

            changedFields.push(

              "address",

            );

          }



          if (

            body.status !==

              undefined &&

            body.status !==

              existing.status

          ) {

            changedFields.push(

              "status",

            );

          }



          if (

            body.hireDate !==

            undefined

          ) {

            const nextHireDate =

              body.hireDate

                ? new Date(

                    body.hireDate,

                  )

                : null;



            const previousTime =

              existing.hireDate?.getTime() ??

              null;



            const nextTime =

              nextHireDate?.getTime() ??

              null;



            if (

              previousTime !==

              nextTime

            ) {

              changedFields.push(

                "hireDate",

              );

            }

          }



          const updated =

            await tx.employee.update({

              where: {

                id:

                  employeeId,

              },



              /*

               * Only fields actually sent by the caller are updated.

               */

              data: {

                ...(body.phone !==

                  undefined && {

                  phone:

                    body.phone ||

                    null,

                }),



                ...(body.position !==

                  undefined && {

                  position:

                    body.position ||

                    null,

                }),



                ...(body.salary !==

                  undefined && {

                  salary:

                    body.salary,

                }),



                ...(body.address !==

                  undefined && {

                  address:

                    body.address ||

                    null,

                }),



                ...(body.status !==

                  undefined && {

                  status:

                    body.status,

                }),



                ...(body.hireDate !==

                  undefined && {

                  hireDate:

                    body.hireDate

                      ? new Date(

                          body.hireDate,

                        )

                      : null,

                }),

              },



              include: {

                user: {

                  select:

                    safeUserSelect,

                },

              },

            });



          await tx.auditLog.create({

            data: {

              actorUserId:

                admin.userId,



              action:

                "EMPLOYEE_UPDATE",



              entityType:

                "Employee",



              entityId:

                employeeId,



              metadata: {

                userId:

                  existing.userId,



                changedFields,



                before: {

                  status:

                    existing.status,



                  position:

                    existing.position,



                  salary:

                    existing.salary ===

                    null

                      ? null

                      : moneyToNumber(

                          existing.salary,

                        ),



                  hireDate:

                    existing.hireDate

                      ? existing.hireDate.toISOString()

                      : null,



                  hasPhone:

                    Boolean(

                      existing.phone,

                    ),



                  hasAddress:

                    Boolean(

                      existing.address,

                    ),

                },



                after: {

                  status:

                    updated.status,



                  position:

                    updated.position,



                  salary:

                    updated.salary ===

                    null

                      ? null

                      : moneyToNumber(

                          updated.salary,

                        ),



                  hireDate:

                    updated.hireDate

                      ? updated.hireDate.toISOString()

                      : null,



                  hasPhone:

                    Boolean(

                      updated.phone,

                    ),



                  hasAddress:

                    Boolean(

                      updated.address,

                    ),

                },

              },



              ipAddress,

              userAgent,

            },

          });



          /*

           * Status changes deserve a dedicated audit event because suspension

           * directly affects authorization in getCurrentUser().

           */

          if (

            existing.status !==

            updated.status

          ) {

            await tx.auditLog.create({

              data: {

                actorUserId:

                  admin.userId,



                action:

                  "EMPLOYEE_STATUS_CHANGE",



                entityType:

                  "Employee",



                entityId:

                  employeeId,



                metadata: {

                  userId:

                    existing.userId,



                  previousStatus:

                    existing.status,



                  newStatus:

                    updated.status,

                },



                ipAddress,

                userAgent,

              },

            });

          }



          return updated;

        },

      );



    return NextResponse.json(

      serializeSalary(

        employee,

      ),

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

      "Failed to update employee",

    );

  }

}



export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    assertSameOrigin(req);

    const admin =
      await requireApiAdmin();

    const {
      id: rawId,
    } = await params;

    const parsedId =
      employeeIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Employee not found",
      );
    }

    const employeeId =
      parsedId.data;

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

    const archivedAt =
      new Date();

    /*
     * Soft-delete the employee instead of removing the account.
     *
     * Historical tasks and appointments remain linked to the employee.
     * The employee is suspended and all active sessions are revoked
     * atomically with the archive operation.
     */
    await prisma.$transaction(
      async (tx) => {
        const employee =
          await tx.employee.findUnique({
            where: {
              id:
                employeeId,
            },

            select: {
              id: true,
              userId: true,
              position: true,
              salary: true,
              hireDate: true,
              status: true,
              phone: true,
              address: true,
              archivedAt: true,
            },
          });

        if (!employee) {
          throw new ApiError(
            404,
            "Employee not found",
          );
        }

        if (
          employee.userId ===
          admin.userId
        ) {
          throw new ApiError(
            409,
            "Cannot archive your own account",
          );
        }

        if (employee.archivedAt) {
          throw new ApiError(
            409,
            "Employee is already archived",
          );
        }

        const [
          tasksCount,
          appointmentsCount,
        ] = await Promise.all([
          tx.task.count({
            where: {
              employeeId,
            },
          }),

          tx.appointment.count({
            where: {
              employeeId,
            },
          }),
        ]);

        await tx.employee.update({
          where: {
            id:
              employeeId,
          },

          data: {
            archivedAt,
            status:
              "SUSPENDED",
          },
        });

        const revokedSessions =
          await tx.authSession.updateMany({
            where: {
              userId:
                employee.userId,
              revokedAt:
                null,
            },

            data: {
              revokedAt:
                archivedAt,
            },
          });

        await tx.auditLog.create({
          data: {
            actorUserId:
              admin.userId,

            action:
              "EMPLOYEE_ARCHIVE",

            entityType:
              "Employee",

            entityId:
              employeeId,

            metadata: {
              userId:
                employee.userId,

              archivedAt:
                archivedAt.toISOString(),

              previousStatus:
                employee.status,

              newStatus:
                "SUSPENDED",

              position:
                employee.position,

              salary:
                employee.salary ===
                null
                  ? null
                  : moneyToNumber(
                      employee.salary,
                    ),

              hireDate:
                employee.hireDate
                  ? employee.hireDate.toISOString()
                  : null,

              hadPhone:
                Boolean(
                  employee.phone,
                ),

              hadAddress:
                Boolean(
                  employee.address,
                ),

              revokedSessions:
                revokedSessions.count,

              linkedRecords: {
                tasks:
                  tasksCount,

                appointments:
                  appointmentsCount,
              },
            },

            ipAddress,
            userAgent,
          },
        });
      },
    );

    return NextResponse.json(
      {
        success: true,
        archived: true,
      },
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
      "Failed to archive employee",
    );
  }
}
