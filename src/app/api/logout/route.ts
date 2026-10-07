import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  apiError,
  assertSameOrigin,
} from "@/lib/api-security";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
) {
  try {
    assertSameOrigin(req);

    const cookieStore =
      await cookies();

    const token =
      cookieStore.get("token")?.value;

    /*
     * Revocation is best-effort:
     * - if the token is valid and has a matching AuthSession, revoke it;
     * - if the token is invalid, expired, malformed, or the session is
     *   already missing/revoked, still continue and clear the browser cookie.
     *
     * Logout should be idempotent and must not reveal authentication details.
     */
    if (token) {
      try {
        const payload =
          await verifyToken(token);

        if (
          typeof payload.userId ===
            "string" &&
          payload.userId.length > 0 &&
          typeof payload.jti ===
            "string" &&
          payload.jti.length > 0
        ) {
          await prisma.authSession.updateMany({
            where: {
              id: payload.jti,
              userId:
                payload.userId,
              revokedAt: null,
            },

            data: {
              revokedAt:
                new Date(),
            },
          });
        }
      } catch {
        /*
         * Invalid or expired tokens are already unusable.
         * Do not fail logout just because revocation is unnecessary.
         */
      }
    }

    const response =
      NextResponse.json(
        {
          success: true,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    /*
     * Clear the authentication cookie using the same security attributes
     * used when it is created.
     *
     * maxAge=0 plus an expired date makes the deletion explicit across
     * browsers and proxies.
     */
    response.cookies.set(
      "token",
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
        expires:
          new Date(0),
      },
    );

    return response;
  } catch (error) {
    return apiError(
      error,
      "Failed to sign out",
    );
  }
}
