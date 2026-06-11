import { verifyRefreshToken } from "@/lib/auth/jwt";
import { isRefreshTokenValid, rotateRefreshToken } from "@/lib/auth/refresh";
import { resolvePermissionsFromRole } from "@/lib/event-user-roles";
import { requireEventBySlug } from "@/lib/events";
import { buildAccessTokenForUser, serializeUser } from "@/lib/users";
import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";
import { prisma } from "@/lib/prisma";

export class EventSessionRefreshError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "EventSessionRefreshError";
  }
}

export async function refreshEventSession(slug: string, refreshToken: string) {
  let event;
  try {
    event = await requireEventBySlug(slug);
  } catch {
    throw new EventSessionRefreshError("Event not found", "NOT_FOUND", 404);
  }

  let userId: string;
  let eventId: string;
  try {
    ({ userId, eventId } = verifyRefreshToken(refreshToken));
  } catch {
    throw new EventSessionRefreshError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (eventId !== event.id) {
    throw new EventSessionRefreshError("Event mismatch", "FORBIDDEN", 403);
  }

  const valid = await isRefreshTokenValid(refreshToken, userId);
  if (!valid) {
    throw new EventSessionRefreshError(
      "Refresh token revoked or expired",
      "REFRESH_EXPIRED",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { team: true, eventUserRole: true },
  });

  if (!user) {
    throw new EventSessionRefreshError("User not found", "USER_NOT_FOUND");
  }

  const newRefreshToken = await rotateRefreshToken(refreshToken, userId, event.id);
  const accessToken = await buildAccessTokenForUser(user.id, slug);
  const permissions = resolvePermissionsFromRole(user.eventUserRole);
  const enabledActivities = await loadEnabledActivitiesSnapshot(event.id);

  return {
    slug,
    accessToken,
    refreshToken: newRefreshToken,
    user: serializeUser(user, slug, permissions, enabledActivities),
  };
}
