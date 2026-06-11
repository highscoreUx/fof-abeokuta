import { NextResponse } from "next/server";
import { verifyRefreshToken, signAccessToken } from "@/lib/auth/jwt";
import {
  getRefreshTokenFromCookies,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
  EVENT_SLUG_COOKIE,
} from "@/lib/auth/cookies";
import { isRefreshTokenValid, rotateRefreshToken } from "@/lib/auth/refresh";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/users";
import { jsonError } from "@/lib/auth/middleware";
import { requireEventBySlug } from "@/lib/events";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let event;
  try {
    event = await requireEventBySlug(slug);
  } catch {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return jsonError("No refresh token", "NO_REFRESH_TOKEN", 401);
  }

  let userId: string;
  let eventId: string;
  try {
    ({ userId, eventId } = verifyRefreshToken(refreshToken));
  } catch {
    return jsonError("Invalid refresh token", "INVALID_REFRESH_TOKEN", 401);
  }

  if (eventId !== event.id) {
    return jsonError("Event mismatch", "FORBIDDEN", 403);
  }

  const valid = await isRefreshTokenValid(refreshToken, userId);
  if (!valid) {
    return jsonError("Refresh token revoked or expired", "REFRESH_EXPIRED", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { team: true },
  });

  if (!user) {
    return jsonError("User not found", "USER_NOT_FOUND", 401);
  }

  const newRefreshToken = await rotateRefreshToken(refreshToken, userId, event.id);
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    teamId: user.teamId,
    eventId: event.id,
    eventSlug: slug,
  });

  const response = NextResponse.json({
    accessToken,
    user: serializeUser(user, slug),
  });

  response.cookies.set(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());
  response.cookies.set(EVENT_SLUG_COOKIE, slug, getRefreshCookieOptions());

  return response;
}
