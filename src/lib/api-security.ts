import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/current-user";

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

const SAFE_METHODS = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
]);

const ERROR_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export class ApiError extends Error {
  status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;

    Object.setPrototypeOf(
      this,
      ApiError.prototype,
    );
  }
}

export async function requireApiUser(
  roles?: UserRole[],
) {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new ApiError(
      401,
      "Unauthorized",
    );
  }

  if (
    roles &&
    !roles.includes(user.role)
  ) {
    throw new ApiError(
      403,
      "Forbidden",
    );
  }

  return user;
}

export async function requireApiAdmin() {
  return requireApiUser([
    "ADMIN",
  ]);
}

export function assertOwnership(
  user: CurrentUser,
  employeeId:
    | string
    | null
    | undefined,
) {
  if (user.role === "ADMIN") {
    return;
  }

  if (
    !user.employeeId ||
    employeeId !==
      user.employeeId
  ) {
    throw new ApiError(
      403,
      "Forbidden",
    );
  }
}

function getRequestHost(
  req: Request,
) {
  /*
   * x-forwarded-host can contain a comma-separated proxy chain.
   * Only the first value represents the original requested host.
   */
  const forwardedHost =
    req.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();

  const host =
    forwardedHost ||
    req.headers
      .get("host")
      ?.trim();

  return host || null;
}

function getSourceUrl(
  req: Request,
) {
  const origin =
    req.headers.get("origin");

  if (origin) {
    return origin;
  }

  /*
   * Some legitimate clients/proxies may omit Origin but include Referer.
   * We accept Referer only as a fallback and still compare its host against
   * the actual request host.
   */
  return req.headers.get(
    "referer",
  );
}

export function assertSameOrigin(
  req: Request,
) {
  if (
    SAFE_METHODS.has(
      req.method.toUpperCase(),
    )
  ) {
    return;
  }

  /*
   * Modern browsers send Sec-Fetch-Site on navigations/fetches.
   * Reject an explicitly cross-site request immediately.
   */
  const fetchSite =
    req.headers.get(
      "sec-fetch-site",
    );

  if (
    fetchSite === "cross-site"
  ) {
    throw new ApiError(
      403,
      "Forbidden",
    );
  }

  const host =
    getRequestHost(req);

  const sourceUrl =
    getSourceUrl(req);

  /*
   * Fail closed for state-changing requests.
   *
   * The previous implementation silently allowed the request when Origin
   * or Host was missing, which created a bypass path for CSRF checks.
   */
  if (!host || !sourceUrl) {
    throw new ApiError(
      403,
      "Forbidden",
    );
  }

  let sourceHost: string;

  try {
    sourceHost =
      new URL(
        sourceUrl,
      ).host;
  } catch {
    throw new ApiError(
      403,
      "Forbidden",
    );
  }

  if (
    sourceHost !== host
  ) {
    throw new ApiError(
      403,
      "Forbidden",
    );
  }
}

export function apiError(
  error: unknown,
  fallback = "Server Error",
) {
  if (
    error instanceof ApiError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status:
          error.status,
        headers:
          ERROR_HEADERS,
      },
    );
  }

  /*
   * Internal details are logged server-side only.
   * Never expose stack traces, Prisma details, secrets, SQL, or environment
   * information to the client.
   */
  console.error(
    "Unhandled API error:",
    error,
  );

  return NextResponse.json(
    {
      error: fallback,
    },
    {
      status: 500,
      headers:
        ERROR_HEADERS,
    },
  );
}

export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;
