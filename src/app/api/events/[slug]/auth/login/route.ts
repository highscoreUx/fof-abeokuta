import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators/auth";
import { findUserByPin, serializeUser } from "@/lib/users";
import { signAccessToken } from "@/lib/auth/jwt";
import { createRefreshToken } from "@/lib/auth/refresh";
import {
  EVENT_SLUG_COOKIE,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { jsonError } from "@/lib/auth/middleware";
import { requireEventBySlug } from "@/lib/events";

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
    return jsonError("Invalid PIN format", "INVALID_PIN", 400);
  }

  const user = await findUserByPin(event.id, parsed.data.pin);
  if (!user) {
    return jsonError("Invalid PIN", "INVALID_CREDENTIALS", 401);
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    teamId: user.teamId,
    eventId: event.id,
    eventSlug: slug,
  });

  const refreshToken = await createRefreshToken(user.id, event.id);

  const response = NextResponse.json({
    accessToken,
    user: serializeUser(user, slug),
  });

  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
  response.cookies.set(EVENT_SLUG_COOKIE, slug, getRefreshCookieOptions());

  return response;
}
