import { cookies } from "next/headers";

export const PLATFORM_REFRESH_COOKIE = "fof_platform_refresh_token";

export function getPlatformRefreshCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getPlatformRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(PLATFORM_REFRESH_COOKIE)?.value;
}
