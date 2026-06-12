import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LoginError, loginToEvent, loginToPlatform } from "@/lib/auth/login-service";
import {
  EVENT_SLUG_COOKIE,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { jsonError } from "@/lib/auth/middleware";
import { requireEventBySlug } from "@/lib/events";
import { rateLimitAllow } from "@/lib/cache/index";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  eventSlug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid credentials", "VALIDATION_ERROR", 400);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const rateKey = parsed.data.eventSlug ? `${parsed.data.eventSlug}:${email}` : `platform:${email}`;
  const allowed = await rateLimitAllow(`login:${rateKey}`, 15, 300);
  if (!allowed) {
    return jsonError("Too many login attempts. Try again in a few minutes.", "RATE_LIMITED", 429);
  }

  try {
    if (parsed.data.eventSlug) {
      let event;
      try {
        event = await requireEventBySlug(parsed.data.eventSlug);
      } catch {
        return jsonError("Event not found", "NOT_FOUND", 404);
      }

      const result = await loginToEvent(
        parsed.data.email,
        parsed.data.password,
        event.id,
        event.slug,
      );

      if (result.mustChangePassword) {
        return NextResponse.json({
          mustChangePassword: true,
          accountAccessToken: result.accountAccessToken,
          account: result.account,
        });
      }

      const response = NextResponse.json({
        accessToken: result.accessToken,
        user: result.user,
      });
      response.cookies.set(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
      response.cookies.set(EVENT_SLUG_COOKIE, result.eventSlug, getRefreshCookieOptions());
      return response;
    }

    const result = await loginToPlatform(parsed.data.email, parsed.data.password);

    if (result.mustChangePassword) {
      return NextResponse.json({
        mustChangePassword: true,
        accountAccessToken: result.accountAccessToken,
        account: result.account,
      });
    }

    const response = NextResponse.json({
      accessToken: result.accessToken,
      account: result.account,
    });
    response.cookies.set(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof LoginError) {
      return jsonError(error.message, error.code, error.status);
    }
    return jsonError("Login failed", "LOGIN_FAILED", 500);
  }
}
