import { verifyRefreshToken } from "@/lib/auth/jwt";
import { signAccountAccessToken } from "@/lib/auth/account-jwt";
import { accountAccessTokenFields } from "@/lib/account-permissions";
import { isRefreshTokenValid, rotateRefreshToken } from "@/lib/auth/refresh";
import { requireEventBySlug } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { serializeAccount } from "@/lib/users";
import { EventSessionRefreshError } from "@/lib/auth/event-session";

export async function refreshGuestEventSession(slug: string, refreshToken: string) {
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

  if (userId) {
    throw new EventSessionRefreshError("Not a guest session", "FORBIDDEN", 403);
  }

  if (!eventId || eventId !== event.id) {
    throw new EventSessionRefreshError("Event mismatch", "FORBIDDEN", 403);
  }

  const valid = await isRefreshTokenValid(refreshToken, accountId);
  if (!valid) {
    throw new EventSessionRefreshError(
      "Refresh token revoked or expired",
      "REFRESH_EXPIRED",
    );
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new EventSessionRefreshError("Account not found", "ACCOUNT_NOT_FOUND");
  }

  if (account.mustChangePassword) {
    throw new EventSessionRefreshError(
      "Password change required",
      "PASSWORD_CHANGE_REQUIRED",
      403,
    );
  }

  const membership = await prisma.user.findUnique({
    where: { accountId_eventId: { accountId, eventId: event.id } },
  });
  if (membership) {
    throw new EventSessionRefreshError(
      "Registered users must refresh through event session",
      "FORBIDDEN",
      403,
    );
  }

  const newRefreshToken = await rotateRefreshToken(refreshToken, {
    accountId,
    eventId: event.id,
  });

  return {
    slug,
    accessToken: signAccountAccessToken(accountAccessTokenFields(account)),
    refreshToken: newRefreshToken,
    account: serializeAccount(account),
    registered: false as const,
  };
}
