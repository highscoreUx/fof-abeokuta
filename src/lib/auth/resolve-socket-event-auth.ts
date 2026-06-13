import { verifyAccountAccessToken } from "@/lib/auth/account-jwt";
import { resolveEventMembership } from "@/lib/auth/event-access";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { assertSessionVersions, loadSessionAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { AccessTokenPayload } from "@/types";

export type SocketEventAuth = AccessTokenPayload & {
  username: string;
  firstName: string;
  lastName: string;
  teamLetter: string | null;
};

function tryParseAccountToken(token: string) {
  try {
    return verifyAccountAccessToken(token);
  } catch {
    return null;
  }
}

export async function resolveSocketEventAuth(
  token: string,
  eventSlug: string,
): Promise<SocketEventAuth> {
  const slug = eventSlug.trim();
  if (!slug) {
    throw new Error("Event slug required");
  }

  let auth: AccessTokenPayload;

  const accountAuth = tryParseAccountToken(token);
  if (accountAuth) {
    const membership = await resolveEventMembership(accountAuth.accountId, slug);
    if (membership.status === "EVENT_NOT_FOUND") {
      throw new Error("Event not found");
    }
    if (membership.status === "NOT_REGISTERED") {
      throw new Error("Not registered for this event");
    }
    if (membership.status === "CHECK_IN_REQUIRED") {
      throw new Error("Check-in required");
    }
    auth = membership.auth;
  } else {
    auth = verifyAccessToken(token);
    if (auth.eventSlug !== slug) {
      throw new Error("Event mismatch");
    }
  }

  const live = await loadSessionAuthContext(auth.userId);
  if (!live) {
    throw new Error("User not found");
  }
  if (assertSessionVersions(auth, live) === "stale") {
    throw new Error("Session permissions are stale");
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { team: true, account: true },
  });
  if (!user || user.eventId !== auth.eventId) {
    throw new Error("User not found");
  }

  return {
    ...auth,
    username: user.account.username,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
    teamLetter: user.team?.letter ?? null,
  };
}
