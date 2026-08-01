import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return new Response(
    `Middleware Works: ${request.nextUrl.pathname}`,
    {
      status: 200,
      headers: {
        "content-type": "text/plain",
      },
    }
  );
}

export const config = {
  matcher: ["/:path*"],
};