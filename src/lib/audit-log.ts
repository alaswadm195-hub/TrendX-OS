import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";

type AuditMetadataValue =
  | string
  | number
  | boolean
  | null;

type AuditMetadata =
  Record<
    string,
    AuditMetadataValue
  >;

type WriteAuditLogInput = {
  req?: Request;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: AuditMetadata;
};

const MAX_ACTION_LENGTH = 100;
const MAX_ENTITY_TYPE_LENGTH = 100;
const MAX_ENTITY_ID_LENGTH = 191;
const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 500;

function normalizeText(
  value: string | null | undefined,
  maxLength: number,
) {
  if (!value) {
    return null;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(
    0,
    maxLength,
  );
}

export async function writeAuditLog(
  input: WriteAuditLogInput,
) {
  const action =
    normalizeText(
      input.action,
      MAX_ACTION_LENGTH,
    );

  const entityType =
    normalizeText(
      input.entityType,
      MAX_ENTITY_TYPE_LENGTH,
    );

  if (
    !action ||
    !entityType
  ) {
    throw new Error(
      "Audit action and entityType are required",
    );
  }

  const ipAddress =
    input.req
      ? normalizeText(
          getClientIp(
            input.req,
          ),
          MAX_IP_LENGTH,
        )
      : null;

  const userAgent =
    input.req
      ? normalizeText(
          input.req.headers.get(
            "user-agent",
          ),
          MAX_USER_AGENT_LENGTH,
        )
      : null;

  return prisma.auditLog.create({
    data: {
      actorUserId:
        input.actorUserId ??
        null,

      action,

      entityType,

      entityId:
        normalizeText(
          input.entityId,
          MAX_ENTITY_ID_LENGTH,
        ),

      metadata:
        input.metadata,

      ipAddress,

      userAgent,
    },
  });
}
