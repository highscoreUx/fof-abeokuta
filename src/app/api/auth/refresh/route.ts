import { NextResponse } from "next/server";
import {
  EVENT_SLUG_COOKIE,
  getEventSlugFromCookies,
  getRefreshCookieOptions,
  getRefreshTokenFromCookies,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { AccountSessionRefreshError, refreshAccountSession } from "@/lib/auth/account-session";
import { EventSessionRefreshError, refreshEventSession } from "@/lib/auth/event-session";
import { refreshGuestEventSession } from "@/lib/auth/event-guest-session";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { jsonError } from "@/lib/auth/middleware";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return jsonError("No refresh token", "NO_REFRESH_TOKEN", 401);
  }

  const slug = await getEventSlugFromCookies();

  try {
    if (slug) {
      let userId: string | undefined;
      try {
        ({ userId } = verifyRefreshToken(refreshToken));
      } catch {
        return jsonError("Invalid refresh token", "INVALID_REFRESH_TOKEN", 401);
      }

      if (userId) {
        const session = await refreshEventSession(slug, refreshToken);
        const response = NextResponse.json({
          accessToken: session.accessToken,
          user: session.user,
        });
        response.cookies.set(REFRESH_COOKIE_NAME, session.refreshToken, getRefreshCookieOptions());
        response.cookies.set(EVENT_SLUG_COOKIE, session.slug, getRefreshCookieOptions());
        return response;
      }

      const session = await refreshGuestEventSession(slug, refreshToken);
      const response = NextResponse.json({
        accessToken: session.accessToken,
        account: session.account,
        eventSlug: session.slug,
        registered: false,
      });
      response.cookies.set(REFRESH_COOKIE_NAME, session.refreshToken, getRefreshCookieOptions());
      response.cookies.set(EVENT_SLUG_COOKIE, session.slug, getRefreshCookieOptions());
      return response;
    }

    const session = await refreshAccountSession(refreshToken);
    const response = NextResponse.json({
      accessToken: session.accessToken,
      account: session.account,
    });
    response.cookies.set(REFRESH_COOKIE_NAME, session.refreshToken, getRefreshCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof EventSessionRefreshError || error instanceof AccountSessionRefreshError) {
      return jsonError(error.message, error.code, error.status);
    }
    return jsonError("Failed to refresh session", "REFRESH_FAILED", 500);
  }
}
