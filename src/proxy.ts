import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { RESERVED_EVENT_SLUGS } from "@/lib/reserved-slugs";

const PLATFORM_PUBLIC = [
  "/change-password",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/change-password",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/change-password",
  "/forgot-password",
  "/reset-password",
  "/all-event",
  "/api/events/public",
  "/api/events/current",
  "/api/health",
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

function loginRedirect(request: NextRequest, returnTo: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", returnTo);
  return NextResponse.redirect(url);
}

function clearStaleRefreshCookie(request: NextRequest): NextResponse | null {
  const refreshToken = request.cookies.get("fof_refresh_token")?.value;
  if (!refreshToken) return null;

  try {
    verifyRefreshToken(refreshToken);
    return null;
  } catch {
    const response = NextResponse.next();
    clearAuthCookies(response);
    return response;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefresh = request.cookies.has("fof_refresh_token");

  if (pathname === "/login" && hasRefresh) {
    const cleared = clearStaleRefreshCookie(request);
    if (cleared) return cleared;
  }

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

  if (pathname === "/fg-admin") {
    return NextResponse.redirect(new URL("/fg-admin/dashboard", request.url));
  }

  const legacyEventLogin = pathname.match(/^\/([^/]+)\/login$/);
  if (legacyEventLogin && !RESERVED_EVENT_SLUGS.has(legacyEventLogin[1])) {
    const slug = legacyEventLogin[1];
    const next = request.nextUrl.searchParams.get("next") ?? `/${slug}/home`;
    return loginRedirect(request, next);
  }

  const eventLoginSlidesMatch = pathname.match(/^\/api\/events\/([^/]+)\/login-slides$/);
  if (eventLoginSlidesMatch) {
    return NextResponse.next();
  }

  const eventApiAuthMatch = pathname.match(/^\/api\/events\/([^/]+)\/auth\/(login|refresh|logout)$/);
  if (eventApiAuthMatch) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const eventChangePasswordMatch = pathname.match(/^\/([^/]+)\/change-password$/);
  if (eventChangePasswordMatch && !RESERVED_EVENT_SLUGS.has(eventChangePasswordMatch[1])) {
    return NextResponse.next();
  }

  const eventLandingMatch = pathname.match(/^\/([^/]+)$/);
  if (eventLandingMatch && !RESERVED_EVENT_SLUGS.has(eventLandingMatch[1])) {
    return NextResponse.next();
  }

  const returnTo = `${pathname}${request.nextUrl.search}`;

  if (pathname.startsWith("/fg-admin")) {
    if (!hasRefresh && !pathname.startsWith("/api/")) {
      return loginRedirect(request, returnTo);
    }
    return NextResponse.next();
  }

  if (!hasRefresh && !pathname.startsWith("/api/")) {
    if (isRootEventProtected(pathname)) {
      return loginRedirect(request, returnTo);
    }

    const slug = pathname.split("/")[1];
    if (slug && !RESERVED_EVENT_SLUGS.has(slug)) {
      return loginRedirect(request, returnTo);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
