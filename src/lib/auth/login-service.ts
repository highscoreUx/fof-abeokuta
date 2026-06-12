import { authenticateAccount } from "@/lib/accounts";
import {
  accountAccessTokenFields,
  canAccessPlatform,
  resolveAccountPermissions,
} from "@/lib/account-permissions";
import { resolveAccountPermissionList } from "@/lib/account-permissions";
import { signAccountAccessToken } from "@/lib/auth/account-jwt";
import { createRefreshToken } from "@/lib/auth/refresh";
import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";
import { prisma } from "@/lib/prisma";
import {
  buildAccessTokenForUser,
  canUserSignIn,
  serializeAccount,
  serializeUser,
} from "@/lib/users";
import { userWithAccountInclude } from "@/lib/user-display";

export class LoginError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "LoginError";
  }
}

export async function loginToPlatform(email: string, password: string) {
  const account = await authenticateAccount(email, password);
  if (!account) {
    throw new LoginError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (account.mustChangePassword) {
    return {
      mustChangePassword: true as const,
      accountAccessToken: signAccountAccessToken(accountAccessTokenFields(account)),
      account: serializeAccount(account),
    };
  }

  if (!canAccessPlatform(resolveAccountPermissions(account))) {
    throw new LoginError("You do not have access to the platform admin", "FORBIDDEN", 403);
  }

  const refreshToken = await createRefreshToken({ accountId: account.id });
  const accessToken = signAccountAccessToken(accountAccessTokenFields(account));

  return {
    mustChangePassword: false as const,
    accessToken,
    refreshToken,
    account: serializeAccount(account),
  };
}

export async function loginToEvent(
  email: string,
  password: string,
  eventId: string,
  eventSlug: string,
) {
  const account = await authenticateAccount(email, password);
  if (!account) {
    throw new LoginError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (account.mustChangePassword) {
    return {
      mustChangePassword: true as const,
      accountAccessToken: signAccountAccessToken(accountAccessTokenFields(account)),
      account: serializeAccount(account),
    };
  }

  const user = await prisma.user.findUnique({
    where: { accountId_eventId: { accountId: account.id, eventId } },
    include: userWithAccountInclude,
  });

  if (!user) {
    throw new LoginError(
      "No registration found for this event. Contact event staff.",
      "NOT_REGISTERED",
      403,
    );
  }

  if (!canUserSignIn(user)) {
    throw new LoginError(
      "You must check in with staff before signing in.",
      "CHECK_IN_REQUIRED",
      403,
    );
  }

  const permissions = resolveAccountPermissionList(account);
  const enabledActivities = await loadEnabledActivitiesSnapshot(eventId);
  const accessToken = await buildAccessTokenForUser(user.id, eventSlug);
  const refreshToken = await createRefreshToken({
    accountId: account.id,
    userId: user.id,
    eventId,
  });

  return {
    mustChangePassword: false as const,
    accessToken,
    refreshToken,
    user: serializeUser(user, eventSlug, permissions, enabledActivities),
    eventSlug,
  };
}
