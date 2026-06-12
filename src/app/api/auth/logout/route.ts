import { NextResponse } from "next/server";
import {
  EVENT_SLUG_COOKIE,
  getRefreshCookieOptions,
  getRefreshTokenFromCookies,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { revokeRefreshToken } from "@/lib/auth/refresh";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(REFRESH_COOKIE_NAME, "", { ...getRefreshCookieOptions(0), maxAge: 0 });
  response.cookies.set(EVENT_SLUG_COOKIE, "", { ...getRefreshCookieOptions(0), maxAge: 0 });
  return response;
}
