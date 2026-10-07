import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PAGE_ROUTES = new Set([
  "/login",
]);

const PUBLIC_API_ROUTES = new Set([
  "/api/login",
  "/api/logout",
]);

const SAFE_METHODS = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
]);

const JWT_ISSUER = "trendx-os";
const JWT_AUDIENCE = "trendx-web";
const JWT_ALGORITHM = "HS256";

function getJwtSecret() {
  const value =
    process.env.JWT_SECRET;

  if (
    !value ||
    value.length < 32
  ) {
    return null;
  }

  return new TextEncoder().encode(
    value,
  );
}

async function hasValidToken(
  request: NextRequest,
) {
  const token =
    request.cookies.get(
      "token",
    )?.value;

  if (!token) {
    return false;
  }

  const secret =
    getJwtSecret();

  if (!secret) {
    return false;
  }

  try {
    const { payload } =
      await jwtVerify(
        token,
        secret,
        {
          issuer: JWT_ISSUER,
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
      return false;
    }

    if (
      typeof payload.sub !==
        "string" ||
      payload.sub !==
        payload.userId
    ) {
      return false;
    }

    if (
      typeof payload.jti !==
        "string" ||
      payload.jti.length === 0
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function clearAuthCookie(
  response: NextResponse,
) {
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
      expires: new Date(0),
    },
  );

  return response;
}

function requestHost(
  request: NextRequest,
) {
  const forwardedHost =
    request.headers
      .get(
        "x-forwarded-host",
      )
      ?.split(",")[0]
      ?.trim();

  return (
    forwardedHost ||
    request.headers
      .get("host")
      ?.trim() ||
    null
  );
}

function requestSource(
  request: NextRequest,
) {
  return (
    request.headers.get(
      "origin",
    ) ||
    request.headers.get(
      "referer",
    )
  );
}

function isSameOriginMutation(
  request: NextRequest,
) {
  if (
    SAFE_METHODS.has(
      request.method.toUpperCase(),
    )
  ) {
    return true;
  }

  const fetchSite =
    request.headers.get(
      "sec-fetch-site",
    );

  if (
    fetchSite === "cross-site"
  ) {
    return false;
  }

  const host =
    requestHost(request);

  const source =
    requestSource(request);

  /*
   * State-changing browser requests fail closed.
   * A missing Origin/Referer is not silently trusted.
   */
  if (
    !host ||
    !source
  ) {
    return false;
  }

  try {
    return (
      new URL(source).host ===
      host
    );
  } catch {
    return false;
  }
}

function unauthorizedApiResponse() {
  return NextResponse.json(
    {
      error: "Unauthorized",
    },
    {
      status: 401,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function forbiddenApiResponse() {
  return NextResponse.json(
    {
      error: "Forbidden",
    },
    {
      status: 403,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function middleware(
  request: NextRequest,
) {
  const { pathname } =
    request.nextUrl;

  /*
   * Static framework assets do not need application authentication.
   */
  if (
    pathname.startsWith(
      "/_next",
    ) ||
    pathname ===
      "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  /*
   * API defense-in-depth.
   *
   * Route handlers still enforce RBAC/ownership themselves.
   * Middleware adds:
   * - default authentication for non-public APIs
   * - JWT signature/issuer/audience validation
   * - CSRF same-origin validation for mutations
   */
  if (
    pathname.startsWith(
      "/api/",
    )
  ) {
    if (
      !isSameOriginMutation(
        request,
      )
    ) {
      return forbiddenApiResponse();
    }

    if (
      PUBLIC_API_ROUTES.has(
        pathname,
      )
    ) {
      return NextResponse.next();
    }

    const validToken =
      await hasValidToken(
        request,
      );

    if (!validToken) {
      return clearAuthCookie(
        unauthorizedApiResponse(),
      );
    }

    return NextResponse.next();
  }

  const validToken =
    await hasValidToken(
      request,
    );

  /*
   * Login page:
   * only a cryptographically valid session is redirected away from /login.
   * A stale or malformed cookie is cleared instead of trapping the user.
   */
  if (
    PUBLIC_PAGE_ROUTES.has(
      pathname,
    )
  ) {
    if (validToken) {
      return NextResponse.redirect(
        new URL(
          "/dashboard",
          request.url,
        ),
      );
    }

    const response =
      NextResponse.next();

    if (
      request.cookies.has(
        "token",
      )
    ) {
      clearAuthCookie(
        response,
      );
    }

    return response;
  }

  /*
   * Protected application pages require a valid signed JWT.
   * Fine-grained role/status/ownership checks remain server-side and are
   * resolved from the database by current-user.ts.
   */
  if (!validToken) {
    const response =
      NextResponse.redirect(
        new URL(
          "/login",
          request.url,
        ),
      );

    return clearAuthCookie(
      response,
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
