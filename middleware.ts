import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
];

export function middleware(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  if (
    pathname.startsWith(
      "/_next"
    ) ||
    pathname.startsWith(
      "/favicon.ico"
    ) ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(
      "token"
    )?.value;

  // لو مسجل دخول وفتح اللوجين
  if (
    pathname === "/login" &&
    token
  ) {
    return NextResponse.redirect(
      new URL(
        "/dashboard",
        request.url
      )
    );
  }

  // الصفحات العامة
  if (
    PUBLIC_ROUTES.includes(
      pathname
    )
  ) {
    return NextResponse.next();
  }

  // حماية باقي النظام
  if (!token) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};