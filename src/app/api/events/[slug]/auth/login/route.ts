import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators/auth";
import {
  canUserSignIn,
  findUserByCredentials,
  serializeUser,
  buildAccessTokenForUser,
} from "@/lib/users";
import { createRefreshToken } from "@/lib/auth/refresh";
import {
  EVENT_SLUG_COOKIE,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { jsonError } from "@/lib/auth/middleware";
import { requireEventBySlug } from "@/lib/events";
import { resolvePermissionsFromRole } from "@/lib/event-user-roles";
import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";

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

  const user = await findUserByCredentials(event.id, parsed.data.username, parsed.data.password);
  if (!user) {
    return jsonError("Invalid username or password", "INVALID_CREDENTIALS", 401);
  }

  if (!canUserSignIn(user)) {
    return jsonError(
      "You must check in with staff before signing in.",
      "CHECK_IN_REQUIRED",
      403,
    );
  }

  const permissions = resolvePermissionsFromRole(user.eventUserRole);
  const enabledActivities = await loadEnabledActivitiesSnapshot(event.id);
  const accessToken = await buildAccessTokenForUser(user.id, slug);
  const refreshToken = await createRefreshToken(user.id, event.id);

  const response = NextResponse.json({
    accessToken,
    user: serializeUser(user, slug, permissions, enabledActivities),
  });

  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
  response.cookies.set(EVENT_SLUG_COOKIE, slug, getRefreshCookieOptions());

  return response;
}
