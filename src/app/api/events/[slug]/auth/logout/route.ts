import { NextResponse } from "next/server";
import {
  EVENT_SLUG_COOKIE,
  getRefreshTokenFromCookies,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { revokeRefreshToken } from "@/lib/auth/refresh";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  const clearOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(REFRESH_COOKIE_NAME, "", clearOpts);
  response.cookies.set(EVENT_SLUG_COOKIE, "", clearOpts);

  return response;
}
