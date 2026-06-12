import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators/auth";
import { LoginError, loginToEvent } from "@/lib/auth/login-service";
import {
  EVENT_SLUG_COOKIE,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { jsonError } from "@/lib/auth/middleware";
import { requireEventBySlug } from "@/lib/events";
import { rateLimitAllow } from "@/lib/cache/index";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let event;
  try {
    event = await requireEventBySlug(slug);
  } catch {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid credentials", "VALIDATION_ERROR", 400);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const allowed = await rateLimitAllow(`login:${event.id}:${email}`, 15, 300);
  if (!allowed) {
    return jsonError("Too many login attempts. Try again in a few minutes.", "RATE_LIMITED", 429);
  }

  try {
    const result = await loginToEvent(
      parsed.data.email,
      parsed.data.password,
      event.id,
      slug,
    );

    if (result.mustChangePassword) {
      return NextResponse.json({
        mustChangePassword: true,
        accountAccessToken: result.accountAccessToken,
        account: result.account,
      });
    }

    if ("registered" in result && result.registered === false) {
      const response = NextResponse.json({
        accessToken: result.accessToken,
        account: result.account,
        eventSlug: slug,
        registered: false,
      });
      response.cookies.set(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
      response.cookies.set(EVENT_SLUG_COOKIE, slug, getRefreshCookieOptions());
      return response;
    }

    const response = NextResponse.json({
      accessToken: result.accessToken,
      user: result.user,
    });

    response.cookies.set(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
    response.cookies.set(EVENT_SLUG_COOKIE, slug, getRefreshCookieOptions());

    return response;
  } catch (error) {
    if (error instanceof LoginError) {
      return jsonError(error.message, error.code, error.status);
    }
    return jsonError("Login failed", "LOGIN_FAILED", 500);
  }
}
