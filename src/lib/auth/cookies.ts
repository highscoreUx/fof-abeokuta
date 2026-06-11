import { cookies } from "next/headers";

export const REFRESH_COOKIE_NAME = "fof_refresh_token";
export const EVENT_SLUG_COOKIE = "fof_event_slug";

export function getRefreshCookieOptions(maxAgeSeconds = 60 * 60 * 24) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value;
}

export async function getEventSlugFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(EVENT_SLUG_COOKIE)?.value;
}
