import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createSessionId,
  createToken,
  getSessionExpiresAt,
  hashPassword,
} from "@/lib/auth";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const loginRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) =>
        value.toLowerCase(),
      ),

    /*
     * Login must accept legacy passwords that already exist.
     * Password-strength rules belong to account creation / password change.
     */
    password: z
      .string()
      .min(1)
      .max(256),
  })
  .strict();

/*
 * Used only when the submitted email does not exist.
 * Performing a real bcrypt comparison in both cases reduces the timing
 * difference between "unknown email" and "wrong password" responses.
 *
 * The hash is generated once per server process and is never used for
 * authentication.
 */
const dummyPasswordHashPromise =
  hashPassword(
    "trendx-invalid-login-dummy-password",
  );

function noStoreJson(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<
    string,
    string
  >,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
        ...extraHeaders,
      },
    },
  );
}

export async function POST(
  req: Request,
) {
  let stage = "rate-limit";

  try {
    const ip =
      getClientIp(req);

    const ipLimit =
      checkRateLimit(
        `login:${ip}`,
        10,
        15 * 60_000,
      );

    if (!ipLimit.allowed) {
      return noStoreJson(
        {
          message:
            "Too many attempts",
        },
        429,
        {
          "Retry-After":
            String(
              ipLimit.retryAfter,
            ),
        },
      );
    }

    stage = "parse-body";

    let rawBody: unknown;

    try {
      rawBody =
        await req.json();
    } catch {
      return noStoreJson(
        {
          message:
            "Invalid request",
        },
        400,
      );
    }

    stage = "validate-input";

    const parsed =
      loginRequestSchema.safeParse(
        rawBody,
      );

    if (!parsed.success) {
      return noStoreJson(
        {
          message:
            "Invalid request",
        },
        400,
      );
    }

    const {
      email,
      password,
    } = parsed.data;

    stage = "find-user";

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,

          employee: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

    stage =
      "verify-password";

    /*
     * Always perform bcrypt comparison.
     * This makes unknown-email and wrong-password paths more similar in cost.
     */
    const passwordHash =
      user?.passwordHash ??
      (await dummyPasswordHashPromise);

    const validPassword =
      await comparePassword(
        password,
        passwordHash,
      );

    /*
     * Do not reveal whether:
     * - the email does not exist,
     * - the password is wrong,
     * - an EMPLOYEE profile is missing,
     * - or the employee is suspended.
     *
     * All of those return the same response.
     */
    const employeeAccountValid =
      !user ||
      user.role !==
        "EMPLOYEE" ||
      Boolean(
        user.employee &&
          user.employee.status !==
            "SUSPENDED",
      );

    if (
      !user ||
      !validPassword ||
      !employeeAccountValid
    ) {
      return noStoreJson(
        {
          message:
            "Invalid email or password",
        },
        401,
      );
    }

    stage =
      "create-session";

    const sessionId =
      createSessionId();

    const expiresAt =
      getSessionExpiresAt();

    /*
     * The AuthSession row is the server-side source of truth for whether
     * this JWT session is still active. The JWT jti uses the exact same ID.
     */
    const token =
      await createToken({
        userId:
          user.id,
        sessionId,
      });

    await prisma.authSession.create({
      data: {
        id:
          sessionId,
        userId:
          user.id,
        expiresAt,
      },
    });

    stage =
      "create-response";

    const response =
      NextResponse.json(
        {
          success: true,

          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    response.cookies.set(
      "token",
      token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "strict",
        path: "/",
        maxAge:
          8 * 60 * 60,
      },
    );

    return response;
  } catch (error) {
    const errorName =
      error instanceof Error
        ? error.name
        : "UnknownError";

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[auth/login] failed during "${stage}"`,
      {
        name: errorName,
        message:
          errorMessage,
      },
    );

    return noStoreJson(
      {
        message:
          "Unable to sign in right now",
      },
      500,
    );
  }
}
