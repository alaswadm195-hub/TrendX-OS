import { cookies } from "next/headers";

import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const payload =
      await verifyToken(token);

    if (
      !payload ||
      typeof payload.userId !== "string" ||
      payload.userId.length === 0 ||
      typeof payload.jti !== "string" ||
      payload.jti.length === 0
    ) {
      return null;
    }

    /*
     * The AuthSession row is the server-side source of truth for whether
     * this JWT is still allowed to authenticate.
     *
     * Looking up the session by the JWT jti and loading the related user in
     * the same query gives us immediate revocation and expiration checks
     * without trusting authorization data embedded in the token.
     */
    const session =
      await prisma.authSession.findUnique({
        where: {
          id: payload.jti,
        },

        select: {
          userId: true,
          expiresAt: true,
          revokedAt: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,

              employee: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
      });

    if (!session) {
      return null;
    }

    /*
     * Fail closed if the session does not belong to the same user named by
     * the signed JWT. This should never happen in valid data, but explicitly
     * checking it prevents a mismatched session record from authenticating.
     */
    if (
      session.userId !==
        payload.userId ||
      session.user.id !==
        payload.userId
    ) {
      return null;
    }

    /*
     * Revocation takes effect immediately. Expiration is checked both by the
     * JWT verifier and by the server-side session record so neither source
     * can extend the other unexpectedly.
     */
    if (
      session.revokedAt !== null ||
      session.expiresAt.getTime() <=
        Date.now()
    ) {
      return null;
    }

    const user =
      session.user;

    /*
     * Never trust role or employeeId from the token.
     *
     * The database remains the source of truth for authorization, so role
     * changes, employee suspension, or employee deletion take effect
     * immediately even while a previously-issued JWT still exists.
     */
    if (
      user.role === "EMPLOYEE"
    ) {
      if (
        !user.employee ||
        user.employee.status ===
          "SUSPENDED"
      ) {
        return null;
      }
    }

    return {
      userId: user.id,
      role: user.role,
      employeeId:
        user.employee?.id ?? null,
      name: user.name,
      email: user.email,
    };
  } catch {
    /*
     * Invalid, expired, malformed, revoked, missing-session, or otherwise
     * unverifiable authentication state fails closed.
     */
    return null;
  }
}
