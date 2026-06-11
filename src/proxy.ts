import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RESERVED_EVENT_SLUGS } from "@/lib/reserved-slugs";

const PLATFORM_PUBLIC = ["/fg-admin/login", "/api/fg-admin/auth/login", "/api/fg-admin/auth/refresh"];

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/all-event",
  "/api/events/public",
  "/api/events/current",
];

const ROOT_PROTECTED_PREFIXES = [
  "/admin",
  "/home",
  "/participant",
  "/staff",
  "/judge",
  "/stage",
];

function isRootEventProtected(pathname: string) {
  return ROOT_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
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
  if (eventLoginMatch && !RESERVED_EVENT_SLUGS.has(eventLoginMatch[1])) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
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

  const eventLandingMatch = pathname.match(/^\/([^/]+)$/);
  if (eventLandingMatch && !RESERVED_EVENT_SLUGS.has(eventLandingMatch[1])) {
    return NextResponse.next();
  }

  const hasEventRefresh = request.cookies.has("fof_refresh_token");

  if (isRootEventProtected(pathname) && !hasEventRefresh && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.match(/^\/([^/]+)\//) && !hasEventRefresh && !pathname.startsWith("/api/")) {
    const slug = pathname.split("/")[1];
    if (!RESERVED_EVENT_SLUGS.has(slug)) {
      return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
