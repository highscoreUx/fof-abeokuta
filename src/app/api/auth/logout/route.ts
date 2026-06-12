import { NextResponse } from "next/server";
import { clearAuthCookies, getRefreshTokenFromCookies } from "@/lib/auth/cookies";
import { revokeRefreshToken } from "@/lib/auth/refresh";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
