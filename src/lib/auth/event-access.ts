import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";
import { getEventBySlug } from "@/lib/events";
import { hasGlobalEventAccess } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";
import { canUserSignIn, serializeUser } from "@/lib/users";
import { userWithAccountInclude } from "@/lib/user-display";
import {
  resolveUserPermissionList,
  resolveUserPermissionsFingerprint,
} from "@/lib/user-permissions";
import type { AccessTokenPayload, AuthUser } from "@/types";

export type EventMembershipStatus =
  | "OK"
  | "EVENT_NOT_FOUND"
  | "NOT_REGISTERED"
  | "CHECK_IN_REQUIRED";

export async function resolveEventMembership(accountId: string, eventSlug: string) {
  const event = await getEventBySlug(eventSlug);
  if (!event) {
    return { status: "EVENT_NOT_FOUND" as const };
  }

  let user = await prisma.user.findUnique({
    where: { accountId_eventId: { accountId, eventId: event.id } },
    include: userWithAccountInclude,
  });

  if (!user) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || !hasGlobalEventAccess(account)) {
      return { status: "NOT_REGISTERED" as const, event };
    }

    user = await prisma.user.create({
      data: { accountId, eventId: event.id },
      include: userWithAccountInclude,
    });
  }

  if (!canUserSignIn(user)) {
    return { status: "CHECK_IN_REQUIRED" as const, event, user };
  }

  const permissions = resolveUserPermissionList(user);
  const enabledActivities = await loadEnabledActivitiesSnapshot(event.id);
  const authUser = serializeUser(user, eventSlug, permissions, enabledActivities);
  const auth = buildEventAccessPayload(user, eventSlug, permissions, enabledActivities);

  return {
    status: "OK" as const,
    event,
    user: authUser,
    auth,
  };
}

export function buildEventAccessPayload(
  user: {
    id: string;
    accountId: string;
    authVersion: number;
    teamId: string | null;
    eventId: string;
    permissions?: unknown | null;
    account: { permissions: unknown; permissionsVersion: number };
  },
  eventSlug: string,
  permissions: AccessTokenPayload["permissions"],
  enabledActivities: AccessTokenPayload["enabledActivities"],
): AccessTokenPayload {
  return {
    userId: user.id,
    accountId: user.accountId,
    permissions,
    authVersion: user.authVersion,
    accountPermissionsVersion: user.account.permissionsVersion,
    permissionsFingerprint: resolveUserPermissionsFingerprint(user),
    teamId: user.teamId,
    eventId: user.eventId,
    eventSlug,
    enabledActivities,
    type: "event",
  };
}

export type ResolvedEventMembership =
  | { status: "EVENT_NOT_FOUND" }
  | { status: "NOT_REGISTERED"; event: { id: string; slug: string; title: string } }
  | { status: "CHECK_IN_REQUIRED"; event: { id: string; slug: string; title: string }; user: AuthUser }
  | {
      status: "OK";
      event: { id: string; slug: string; title: string };
      user: AuthUser;
      auth: AccessTokenPayload;
    };
