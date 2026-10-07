import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getClientIp } from "@/lib/rate-limit";

import {
  ApiError,
  apiError,
  assertSameOrigin,
} from "@/lib/api-security";

const clientIdSchema =
  z.string().cuid();

const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

const optionalText = (
  max: number,
) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable();

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine(
    (value) =>
      value === "" ||
      z
        .string()
        .email()
        .safeParse(value)
        .success,
    "Invalid email",
  )
  .optional()
  .nullable();

const clientUpdateSchema =
  z
    .object({
      name: z
        .string()
        .trim()
        .min(1)
        .max(160),

      phone: z
        .string()
        .trim()
        .max(32)
        .optional()
        .nullable(),

      email:
        optionalEmail,

      company:
        optionalText(160),

      notes:
        optionalText(5000),
    })
    .strict();

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

function normalizeNullable(
  value:
    | string
    | null
    | undefined,
) {
  return value || null;
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
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(
        401,
        "Unauthorized",
      );
    }

    const {
      id: rawId,
    } = await params;

    const parsedId =
      clientIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Client not found",
      );
    }

    const client =
      await prisma.client.findFirst({
        where: {
          id: parsedId.data,
          archivedAt: null,
        },
      });

    if (!client) {
      throw new ApiError(
        404,
        "Client not found",
      );
    }

    /*
     * Current authorization model:
     * clients are shared company records rather than employee-owned records.
     * Therefore any authenticated user may read an individual client.
     */
    return NextResponse.json(
      client,
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
      "Failed to fetch client",
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

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(
        401,
        "Unauthorized",
      );
    }

    if (
      currentUser.role !==
      "ADMIN"
    ) {
      throw new ApiError(
        403,
        "Forbidden",
      );
    }

    const {
      id: rawId,
    } = await params;

    const parsedId =
      clientIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Client not found",
      );
    }

    let rawBody: unknown;

    try {
      rawBody =
        await req.json();
    } catch {
      throw new ApiError(
        400,
        "Invalid JSON",
      );
    }

    const parsedBody =
      clientUpdateSchema.safeParse(
        rawBody,
      );

    if (!parsedBody.success) {
      throw new ApiError(
        400,
        "Invalid request data",
      );
    }

    const body =
      parsedBody.data;

    const id =
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
     * Client update and AuditLog creation are committed atomically.
     *
     * PII values are never copied into audit metadata. Instead, we record
     * only which fields changed and presence flags for optional fields.
     */
    const client =
      await prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.client.findUnique({
              where: {
                id,
              },

              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                company: true,
                notes: true,
                archivedAt: true,
              },
            });

          if (!existing) {
            throw new ApiError(
              404,
              "Client not found",
            );
          }

          if (existing.archivedAt) {
            throw new ApiError(
              409,
              "Archived client cannot be updated",
            );
          }

          const nextPhone =
            normalizeNullable(
              body.phone,
            );

          const nextEmail =
            normalizeNullable(
              body.email,
            );

          const nextCompany =
            normalizeNullable(
              body.company,
            );

          const nextNotes =
            normalizeNullable(
              body.notes,
            );

          const changedFields:
            string[] = [];

          if (
            existing.name !==
            body.name
          ) {
            changedFields.push(
              "name",
            );
          }

          if (
            existing.phone !==
            nextPhone
          ) {
            changedFields.push(
              "phone",
            );
          }

          if (
            existing.email !==
            nextEmail
          ) {
            changedFields.push(
              "email",
            );
          }

          if (
            existing.company !==
            nextCompany
          ) {
            changedFields.push(
              "company",
            );
          }

          if (
            existing.notes !==
            nextNotes
          ) {
            changedFields.push(
              "notes",
            );
          }

          const updated =
            await tx.client.update({
              where: {
                id,
              },

              data: {
                name:
                  body.name,

                phone:
                  nextPhone,

                email:
                  nextEmail,

                company:
                  nextCompany,

                notes:
                  nextNotes,
              },
            });

          await tx.auditLog.create({
            data: {
              actorUserId:
                currentUser.userId,

              action:
                "CLIENT_UPDATE",

              entityType:
                "Client",

              entityId:
                id,

              metadata: {
                changedFields,

                before: {
                  hasPhone:
                    Boolean(
                      existing.phone,
                    ),

                  hasEmail:
                    Boolean(
                      existing.email,
                    ),

                  hasCompany:
                    Boolean(
                      existing.company,
                    ),

                  hasNotes:
                    Boolean(
                      existing.notes,
                    ),
                },

                after: {
                  hasPhone:
                    Boolean(
                      updated.phone,
                    ),

                  hasEmail:
                    Boolean(
                      updated.email,
                    ),

                  hasCompany:
                    Boolean(
                      updated.company,
                    ),

                  hasNotes:
                    Boolean(
                      updated.notes,
                    ),
                },
              },

              ipAddress,
              userAgent,
            },
          });

          return updated;
        },
      );

    return NextResponse.json(
      client,
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
      "Failed to update client",
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

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(
        401,
        "Unauthorized",
      );
    }

    if (
      currentUser.role !==
      "ADMIN"
    ) {
      throw new ApiError(
        403,
        "Forbidden",
      );
    }

    const {
      id: rawId,
    } = await params;

    const parsedId =
      clientIdSchema.safeParse(
        rawId,
      );

    if (!parsedId.success) {
      throw new ApiError(
        404,
        "Client not found",
      );
    }

    const id =
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
     * Soft delete:
     * keep the client and all linked business history intact, but remove the
     * client from normal active workflows by setting archivedAt.
     */
    const archivedAt =
      new Date();

    await prisma.$transaction(
      async (tx) => {
        const client =
          await tx.client.findUnique({
            where: {
              id,
            },

            select: {
              id: true,
              phone: true,
              email: true,
              company: true,
              notes: true,
              archivedAt: true,
            },
          });

        if (!client) {
          throw new ApiError(
            404,
            "Client not found",
          );
        }

        if (client.archivedAt) {
          throw new ApiError(
            409,
            "Client is already archived",
          );
        }

        const [
          subscriptions,
          invoices,
          tasks,
          appointments,
        ] = await Promise.all([
          tx.subscription.count({
            where: {
              clientId: id,
            },
          }),

          tx.invoice.count({
            where: {
              clientId: id,
            },
          }),

          tx.task.count({
            where: {
              clientId: id,
            },
          }),

          tx.appointment.count({
            where: {
              clientId: id,
            },
          }),
        ]);

        await tx.client.update({
          where: {
            id,
          },

          data: {
            archivedAt,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId:
              currentUser.userId,

            action:
              "CLIENT_ARCHIVE",

            entityType:
              "Client",

            entityId:
              id,

            metadata: {
              archivedAt:
                archivedAt.toISOString(),

              hadPhone:
                Boolean(
                  client.phone,
                ),

              hadEmail:
                Boolean(
                  client.email,
                ),

              hadCompany:
                Boolean(
                  client.company,
                ),

              hadNotes:
                Boolean(
                  client.notes,
                ),

              linkedRecords: {
                subscriptions,
                invoices,
                tasks,
                appointments,
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
      "Failed to archive client",
    );
  }
}
