import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const REFRESH_COOKIE_NAME = "fof_refresh_token";

/** @deprecated Legacy second cookie — cleared on auth responses during migration. */
const LEGACY_EVENT_SLUG_COOKIE = "fof_event_slug";

export function getRefreshCookieOptions(maxAgeSeconds = 60 * 60 * 24) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function setRefreshCookie(response: NextResponse, token: string) {
  response.cookies.set(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
  clearLegacyEventSlugCookie(response);
}

export function clearAuthCookies(response: NextResponse) {
  const expired = { ...getRefreshCookieOptions(0), maxAge: 0 };
  response.cookies.set(REFRESH_COOKIE_NAME, "", expired);
  clearLegacyEventSlugCookie(response);
}

export function clearLegacyEventSlugCookie(response: NextResponse) {
  response.cookies.set(LEGACY_EVENT_SLUG_COOKIE, "", { ...getRefreshCookieOptions(0), maxAge: 0 });
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value;
}
