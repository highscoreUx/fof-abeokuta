import { NextResponse } from "next/server";
import {
  EVENT_SLUG_COOKIE,
  getEventSlugFromCookies,
  getRefreshCookieOptions,
  getRefreshTokenFromCookies,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { EventSessionRefreshError, refreshEventSession } from "@/lib/auth/event-session";
import { jsonError } from "@/lib/auth/middleware";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return jsonError("No refresh token", "NO_REFRESH_TOKEN", 401);
  }

  const slug = await getEventSlugFromCookies();
  if (!slug) {
    return jsonError("No event session", "NO_EVENT_SESSION", 401);
  }

  try {
    const session = await refreshEventSession(slug, refreshToken);
    const response = NextResponse.json({
      accessToken: session.accessToken,
      user: session.user,
    });

    response.cookies.set(REFRESH_COOKIE_NAME, session.refreshToken, getRefreshCookieOptions());
    response.cookies.set(EVENT_SLUG_COOKIE, session.slug, getRefreshCookieOptions());

    return response;
  } catch (error) {
    if (error instanceof EventSessionRefreshError) {
      return jsonError(error.message, error.code, error.status);
    }
    return jsonError("Failed to refresh session", "REFRESH_FAILED", 500);
  }
}
