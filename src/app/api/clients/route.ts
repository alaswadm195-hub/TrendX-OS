import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { normalizeClientPhone } from "@/lib/client-phone";
import { getCurrentUser } from "@/lib/current-user";
import { getClientIp } from "@/lib/rate-limit";
import {
  ApiError,
  apiError,
  assertSameOrigin,
} from "@/lib/api-security";

const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine(
    (value) =>
      value === "" ||
      z.string().email().safeParse(value).success,
    "Invalid email",
  )
  .optional()
  .nullable();

const clientCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(1).max(32),
    email: optionalEmail,
    company: optionalText(160),
    notes: optionalText(5000),
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

export async function GET() {
  try {
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      throw new ApiError(
        401,
        "Unauthorized",
      );
    }

    /*
     * Current business model:
     * clients are shared company records, not employee-owned records.
     * Therefore every authenticated user may read the active client list.
     *
     * Archived clients remain in the database for historical invoices,
     * subscriptions, tasks, appointments, reports, and audit trails, but are
     * intentionally excluded from normal day-to-day workflows.
     */
    const clients =
      await prisma.client.findMany({
        where: {
          archivedAt: null,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(
      clients,
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
      "Failed to fetch clients",
    );
  }
}

export async function POST(
  req: Request,
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

    const parsed =
      clientCreateSchema.safeParse(
        rawBody,
      );

    if (!parsed.success) {
      throw new ApiError(
        400,
        "Invalid request data",
      );
    }

    const body =
      parsed.data;

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
     * Client creation and its AuditLog row are committed atomically.
     *
     * Personally identifiable client fields such as name, phone, email,
     * and notes are intentionally excluded from audit metadata.
     */
    const result =
      await prisma.$transaction(
        async (tx) => {
          // Reuse an existing active client rather than creating another
          // record when the same phone is entered for a new invoice/client.
          const activeClients = await tx.client.findMany({
            where: { archivedAt: null, phone: { not: null } },
            select: { id: true, phone: true },
          });

          const normalizedPhone = normalizeClientPhone(body.phone);
          const match = activeClients.find(
            (candidate) =>
              normalizeClientPhone(candidate.phone) === normalizedPhone,
          );

          if (match) {
            const existingClient = await tx.client.findUniqueOrThrow({
              where: { id: match.id },
            });
            return { client: existingClient, created: false };
          }

          const createdClient =
            await tx.client.create({
              data: {
                name:
                  body.name,

                phone:
                  body.phone,

                email:
                  body.email ||
                  null,

                company:
                  body.company ||
                  null,

                notes:
                  body.notes ||
                  null,
              },
            });

          await tx.auditLog.create({
            data: {
              actorUserId:
                currentUser.userId,

              action:
                "CLIENT_CREATE",

              entityType:
                "Client",

              entityId:
                createdClient.id,

              metadata: {
                hasEmail:
                  Boolean(
                    createdClient.email,
                  ),

                hasCompany:
                  Boolean(
                    createdClient.company,
                  ),

                hasNotes:
                  Boolean(
                    createdClient.notes,
                  ),
              },

              ipAddress,
              userAgent,
            },
          });

          return { client: createdClient, created: true };
        },
      );

    return NextResponse.json(
      result.client,
      {
        status: result.created ? 201 : 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(
      error,
      "Failed to create client",
    );
  }
}
