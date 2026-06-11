import { NextResponse } from "next/server";
import {
  getPlatformRefreshTokenFromCookies,
  PLATFORM_REFRESH_COOKIE,
} from "@/lib/platform-auth/cookies";
import { revokePlatformRefreshToken } from "@/lib/platform-auth/refresh";

export async function POST() {
  const refreshToken = await getPlatformRefreshTokenFromCookies();
  if (refreshToken) {
    await revokePlatformRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(PLATFORM_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}
