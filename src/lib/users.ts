import { prisma } from "@/lib/prisma";
import {
  createAccount,
  findAccountByEmail,
  normalizeEmail,
  normalizeUsername,
} from "@/lib/accounts";
import { resolveAccountPermissionList, requiresEventCheckIn } from "@/lib/account-permissions";
import { loadSessionAuthContext } from "@/lib/auth/session";
import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";
import { signAccessToken } from "@/lib/auth/jwt";
import type { AuthUser } from "@/types";
import type { Permission } from "@/lib/permissions/catalog";
import type { RolePermission } from "@/lib/permissions/catalog";
import type { EnabledActivitySnapshot } from "@/lib/activities/catalog";
import {
  getProfileLabelForPermissions,
  getProfilePermissions,
  legacyRoleToProfileSlug,
} from "@/lib/permission-profiles";
import {
  isLockedMemberAccount,
  isParticipantPermissions,
  isPlatformAdminPermissions,
  resolveMemberProfileSlug,
} from "@/lib/member-access";
import {
  pickUserProfile,
  userWithAccountInclude,
  type UserWithAccount,
} from "@/lib/user-display";
import type { PlatformMemberRow } from "@/types/members";

const TEAM_LETTERS = ["F", "I", "G", "M", "A"];

export function serializeAccount(account: {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  permissions: unknown;
  mustChangePassword: boolean;
}) {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    firstName: account.firstName,
    lastName: account.lastName,
    permissions: resolveAccountPermissionList(account),
    mustChangePassword: account.mustChangePassword,
  };
}

export function serializeUser(
  user: UserWithAccount,
  eventSlug: string,
  permissions: Permission[],
  enabledActivities: EnabledActivitySnapshot[] = [],
): AuthUser {
  const profile = pickUserProfile(user);
  return {
    id: user.id,
    accountId: user.accountId,
    permissions,
    permissionProfile: getProfileLabelForPermissions(user.account.permissions),
    username: profile.username,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    middleName: profile.middleName,
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    eventId: user.eventId,
    eventSlug,
    enabledActivities,
  };
}

export async function buildAccessTokenForUser(userId: string, eventSlug: string) {
  const session = await loadSessionAuthContext(userId);
  if (!session) throw new Error("User not found");

  const enabledActivities = await loadEnabledActivitiesSnapshot(session.eventId);

  return signAccessToken({
    userId: session.userId,
    accountId: session.accountId,
    permissions: session.permissions,
    authVersion: session.authVersion,
    accountPermissionsVersion: session.accountPermissionsVersion,
    permissionsFingerprint: session.permissionsFingerprint,
    teamId: session.teamId,
    eventId: session.eventId,
    eventSlug,
    enabledActivities,
  });
}

export function canUserSignIn(user: UserWithAccount): boolean {
  if (!requiresEventCheckIn(user.account.permissions as RolePermission[])) return true;
  return Boolean(user.checkedInAt);
}

export async function createUserFromRow(
  eventId: string,
  row: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    permissions?: RolePermission[];
    permissionProfile?: string;
    role?: string;
    password?: string;
  },
) {
  const email = normalizeEmail(row.email);
  const username = normalizeUsername(row.username);

  const permissions =
    row.permissions ??
    getProfilePermissions(
      row.permissionProfile ?? (row.role ? legacyRoleToProfileSlug(row.role) : "participant"),
    );

  const existingMembership = await prisma.user.findFirst({
    where: { eventId, account: { email } },
  });
  if (existingMembership) {
    throw new Error("This email is already registered for this event");
  }

  let account = await findAccountByEmail(email);
  let initialPassword: string | null = null;

  if (account) {
    if (account.username !== username) {
      throw new Error("Email is already linked to a different username");
    }
  } else {
    const created = await createAccount({
      email,
      username,
      firstName: row.firstName,
      lastName: row.lastName,
      middleName: row.middleName,
      password: row.password,
      permissions,
      mustChangePassword: true,
    });
    account = created.account;
    initialPassword = created.initialPassword;
  }

  const user = await prisma.user.create({
    data: {
      accountId: account.id,
      eventId,
    },
    include: userWithAccountInclude,
  });

  return { user, initialPassword, permissionProfile: getProfileLabelForPermissions(permissions) };
}

export async function createEventAdminUser(
  eventId: string,
  data: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
  },
) {
  return createUserFromRow(eventId, {
    ...data,
    permissionProfile: "event_admin",
  });
}

export function serializePlatformEventUser(user: UserWithAccount) {
  const profile = pickUserProfile(user);
  return {
    id: user.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: profile.username,
    email: profile.email,
    permissionProfile: getProfileLabelForPermissions(user.account.permissions),
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializePlatformCreatedUser(
  user: UserWithAccount,
  initialPassword: string | null,
  permissionProfile: string,
) {
  const profile = pickUserProfile(user);
  return {
    email: profile.email,
    username: profile.username,
    password: initialPassword ?? "",
    firstName: profile.firstName,
    lastName: profile.lastName,
    permissionProfile,
  };
}

export function serializeMemberRow(
  account: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    permissions: unknown;
    createdAt: Date;
    _count?: { users: number };
  },
): PlatformMemberRow {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    firstName: account.firstName,
    lastName: account.lastName,
    permissionProfile: getProfileLabelForPermissions(account.permissions),
    permissionProfileSlug: resolveMemberProfileSlug(account.permissions),
    eventCount: account._count?.users ?? 0,
    createdAt: account.createdAt.toISOString(),
    isDeletable: !isLockedMemberAccount(account.permissions),
    isPlatformAdmin: isPlatformAdminPermissions(account.permissions),
    isParticipant: isParticipantPermissions(account.permissions),
  };
}

export function serializeUserRow(user: UserWithAccount) {
  const profile = pickUserProfile(user);
  return {
    id: user.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: profile.username,
    email: profile.email,
    permissionProfile: getProfileLabelForPermissions(user.account.permissions),
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export { TEAM_LETTERS, userWithAccountInclude };
