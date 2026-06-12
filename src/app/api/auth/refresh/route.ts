import { NextResponse } from "next/server";
import { getRefreshTokenFromCookies, setRefreshCookie } from "@/lib/auth/cookies";
import { AccountSessionRefreshError, refreshAccountSession } from "@/lib/auth/account-session";
import { jsonError } from "@/lib/auth/middleware";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return jsonError("No refresh token", "NO_REFRESH_TOKEN", 401);
  }

  try {
    const session = await refreshAccountSession(refreshToken);
    const response = NextResponse.json({
      accessToken: session.accessToken,
      account: session.account,
    });
    setRefreshCookie(response, session.refreshToken);
    return response;
  } catch (error) {
    if (error instanceof AccountSessionRefreshError) {
      return jsonError(error.message, error.code, error.status);
    }
    return jsonError("Failed to refresh session", "REFRESH_FAILED", 500);
  }
}
