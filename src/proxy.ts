import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PLATFORM_PUBLIC = ["/fg-admin/login", "/api/fg-admin/auth/login", "/api/fg-admin/auth/refresh"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    pathname.startsWith("/api/events/public") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/socket.io") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/favicon.ico" ||
    PLATFORM_PUBLIC.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/fg-admin")) {
    const hasPlatformRefresh = request.cookies.has("fof_platform_refresh_token");
    if (!hasPlatformRefresh && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/fg-admin/login", request.url));
    }
    return NextResponse.next();
  }

  const eventLoginMatch = pathname.match(/^\/([^/]+)\/login$/);
  if (eventLoginMatch) {
    return NextResponse.next();
  }

  const eventLoginSlidesMatch = pathname.match(/^\/api\/events\/([^/]+)\/login-slides$/);
  if (eventLoginSlidesMatch) {
    return NextResponse.next();
  }

  const eventApiAuthMatch = pathname.match(/^\/api\/events\/([^/]+)\/auth\/(login|refresh)$/);
  if (eventApiAuthMatch) {
    return NextResponse.next();
  }

  const hasEventRefresh = request.cookies.has("fof_refresh_token");

  if (pathname.match(/^\/([^/]+)\//) && !hasEventRefresh && !pathname.startsWith("/api/")) {
    const slug = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
