import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";

const JWT_ISSUER = "trendx-os";
const JWT_AUDIENCE = "trendx-web";
const JWT_ALGORITHM = "HS256";
const JWT_TTL_SECONDS =
  8 * 60 * 60;

function jwtSecret() {
  const value =
    process.env.JWT_SECRET;

  if (
    !value ||
    value.length < 32
  ) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters",
    );
  }

  return new TextEncoder().encode(
    value,
  );
}

export function createSessionId() {
  return randomUUID();
}

export function getSessionExpiresAt(
  issuedAt = new Date(),
) {
  return new Date(
    issuedAt.getTime() +
      JWT_TTL_SECONDS * 1000,
  );
}

export async function hashPassword(
  password: string,
) {
  return bcrypt.hash(
    password,
    12,
  );
}

export async function comparePassword(
  password: string,
  hash: string,
) {
  return bcrypt.compare(
    password,
    hash,
  );
}

export async function createToken(
  payload: {
    userId: string;
    role?: string;
    sessionId?: string;
  },
) {
  const sessionId =
    payload.sessionId ??
    createSessionId();

  const issuedAt =
    Math.floor(
      Date.now() / 1000,
    );

  const expiresAt =
    issuedAt +
    JWT_TTL_SECONDS;

  return new SignJWT({
    userId:
      payload.userId,
  })
    .setProtectedHeader({
      alg: JWT_ALGORITHM,
      typ: "JWT",
    })
    .setIssuer(
      JWT_ISSUER,
    )
    .setAudience(
      JWT_AUDIENCE,
    )
    .setSubject(
      payload.userId,
    )
    .setJti(
      sessionId,
    )
    .setIssuedAt(
      issuedAt,
    )
    .setExpirationTime(
      expiresAt,
    )
    .sign(
      jwtSecret(),
    );
}

export async function verifyToken(
  token: string,
) {
  const { payload } =
    await jwtVerify(
      token,
      jwtSecret(),
      {
        issuer:
          JWT_ISSUER,
        audience:
          JWT_AUDIENCE,
        algorithms: [
          JWT_ALGORITHM,
        ],
      },
    );

  if (
    typeof payload.userId !==
      "string" ||
    payload.userId.length === 0
  ) {
    throw new Error(
      "Invalid token payload",
    );
  }

  if (
    typeof payload.sub !==
      "string" ||
    payload.sub !==
      payload.userId
  ) {
    throw new Error(
      "Invalid token subject",
    );
  }

  if (
    typeof payload.jti !==
      "string" ||
    payload.jti.length === 0
  ) {
    throw new Error(
      "Invalid token identifier",
    );
  }

  if (
    typeof payload.iat !==
      "number" ||
    typeof payload.exp !==
      "number"
  ) {
    throw new Error(
      "Invalid token timestamps",
    );
  }

  return payload;
}
