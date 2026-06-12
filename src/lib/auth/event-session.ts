import { verifyRefreshToken } from "@/lib/auth/jwt";
import { resolveAccountPermissionList } from "@/lib/account-permissions";
import { isRefreshTokenValid, rotateRefreshToken } from "@/lib/auth/refresh";
import { requireEventBySlug } from "@/lib/events";
import { buildAccessTokenForUser, canUserSignIn, serializeUser } from "@/lib/users";
import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";
import { prisma } from "@/lib/prisma";
import { userWithAccountInclude } from "@/lib/user-display";

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

  let accountId: string;
  let userId: string | undefined;
  let eventId: string | undefined;
  try {
    ({ accountId, userId, eventId } = verifyRefreshToken(refreshToken));
  } catch {
    throw new EventSessionRefreshError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (!userId || !eventId || eventId !== event.id) {
    throw new EventSessionRefreshError("Event mismatch", "FORBIDDEN", 403);
  }

  const valid = await isRefreshTokenValid(refreshToken, accountId);
  if (!valid) {
    throw new EventSessionRefreshError(
      "Refresh token revoked or expired",
      "REFRESH_EXPIRED",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userWithAccountInclude,
  });

  if (!user || user.accountId !== accountId) {
    throw new EventSessionRefreshError("User not found", "USER_NOT_FOUND");
  }

  if (!canUserSignIn(user)) {
    throw new EventSessionRefreshError(
      "You must check in with staff before signing in.",
      "CHECK_IN_REQUIRED",
      403,
    );
  }

  const newRefreshToken = await rotateRefreshToken(refreshToken, {
    accountId,
    userId,
    eventId: event.id,
  });
  const accessToken = await buildAccessTokenForUser(user.id, slug);
  const permissions = resolveAccountPermissionList(user.account);
  const enabledActivities = await loadEnabledActivitiesSnapshot(event.id);

  return {
    slug,
    accessToken,
    refreshToken: newRefreshToken,
    user: serializeUser(user, slug, permissions, enabledActivities),
  };
}
