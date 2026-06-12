import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/bcrypt";
import { shufflePhrases } from "@/lib/design-phrases";
import {
  formatEmail,
  getPinRangeForRoleSlug,
  isPinInRoleSlugRange,
  slugifyFirstName,
  canViewPassword,
} from "@/lib/permissions";
import {
  getEventUserRoleBySlug,
  getEventUserRoleIdForLegacyRole,
} from "@/lib/event-user-roles";
import { loadSessionAuthContext } from "@/lib/auth/session";
import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";
import { signAccessToken } from "@/lib/auth/jwt";
import type { AuthUser } from "@/types";
import type { Permission } from "@/lib/permissions/catalog";
import type { EnabledActivitySnapshot } from "@/lib/activities/catalog";

const TEAM_LETTERS = ["F", "I", "G", "M", "A"];

export function serializeUser(
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    teamId: string | null;
    eventId: string;
    loginPhrase?: string | null;
    team?: { letter: string } | null;
    pinDisplay?: string | null;
    eventUserRole: {
      id: string;
      slug: string;
      name: string;
      permissions: unknown;
    };
  },
  eventSlug: string,
  permissions: Permission[],
  enabledActivities: EnabledActivitySnapshot[] = [],
): AuthUser & { loginPhrase?: string | null; passwordDisplay?: string | null } {
  return {
    id: user.id,
    permissions,
    eventUserRoleId: user.eventUserRole.id,
    eventUserRoleSlug: user.eventUserRole.slug,
    eventUserRoleName: user.eventUserRole.name,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName,
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    eventId: user.eventId,
    eventSlug,
    enabledActivities,
    loginPhrase: user.loginPhrase,
    passwordDisplay: user.pinDisplay,
  };
}

export async function buildAccessTokenForUser(userId: string, eventSlug: string) {
  const session = await loadSessionAuthContext(userId);
  if (!session) throw new Error("User not found");

  const enabledActivities = await loadEnabledActivitiesSnapshot(session.eventId);

  return signAccessToken({
    userId: session.userId,
    permissions: session.permissions,
    eventUserRoleId: session.eventUserRoleId,
    eventUserRoleSlug: session.eventUserRoleSlug,
    authVersion: session.authVersion,
    permissionsVersion: session.permissionsVersion,
    rolePermissionsVersion: session.rolePermissionsVersion,
    permissionsFingerprint: session.permissionsFingerprint,
    teamId: session.teamId,
    eventId: session.eventId,
    eventSlug,
    enabledActivities,
  });
}

export function canUserSignIn(user: {
  checkedInAt: Date | null;
  eventUserRole: { slug: string };
}): boolean {
  if (user.eventUserRole.slug !== "participant") return true;
  return Boolean(user.checkedInAt);
}

export async function findUserByCredentials(
  eventId: string,
  username: string,
  password: string,
) {
  const normalized = username.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { eventId_username: { eventId, username: normalized } },
    include: { team: true, eventUserRole: true },
  });

  if (!user) return null;

  const { verifyPin } = await import("@/lib/auth/bcrypt");
  if (!(await verifyPin(password, user.pinHash))) return null;

  const passwordNum = parseInt(password, 10);
  if (
    !Number.isNaN(passwordNum) &&
    !isPinInRoleSlugRange(passwordNum, user.eventUserRole.slug)
  ) {
    return null;
  }

  return user;
}

export async function allocateLoginIdentity(eventId: string, firstName: string) {
  const base = slugifyFirstName(firstName);
  const existingUsernames = new Set(
    (
      await prisma.user.findMany({
        where: { eventId },
        select: { username: true },
      })
    ).map((u) => u.username),
  );

  for (const phrase of shufflePhrases()) {
    const username = `${base}.${phrase}`;
    if (!existingUsernames.has(username)) {
      return {
        username,
        phrase,
        email: formatEmail(username),
      };
    }
  }

  throw new Error(`No available login names for ${firstName} in this event`);
}

export async function generateNextPassword(
  eventId: string,
  roleSlug: string,
  usedPasswords: Set<string>,
): Promise<string> {
  const { min, max } = getPinRangeForRoleSlug(roleSlug);
  for (let i = 0; i < 5000; i++) {
    const password = String(Math.floor(Math.random() * (max - min + 1)) + min).padStart(4, "0");
    if (!usedPasswords.has(password)) return password;
  }
  throw new Error(`No available passwords for access profile ${roleSlug}`);
}

export async function createUserFromRow(
  eventId: string,
  row: {
    firstName: string;
    lastName: string;
    middleName?: string;
    eventUserRoleId?: string;
    role?: string;
    password?: string;
  },
) {
  const { username, phrase, email } = await allocateLoginIdentity(eventId, row.firstName);

  let eventUserRoleId = row.eventUserRoleId;
  let roleSlug: string;

  if (eventUserRoleId) {
    const role = await prisma.eventUserRole.findFirst({
      where: { id: eventUserRoleId, eventId },
    });
    if (!role) throw new Error("Access profile not found");
    roleSlug = role.slug;
  } else if (row.role) {
    eventUserRoleId = await getEventUserRoleIdForLegacyRole(eventId, row.role);
    const role = await prisma.eventUserRole.findUnique({
      where: { id: eventUserRoleId },
    });
    roleSlug = role?.slug ?? "participant";
  } else {
    eventUserRoleId = await getEventUserRoleIdForLegacyRole(eventId, "PARTICIPANT");
    roleSlug = "participant";
  }

  const usedPasswords = new Set(
    (
      await prisma.user.findMany({
        where: { eventId, pinDisplay: { not: null } },
        select: { pinDisplay: true },
      })
    )
      .map((u) => u.pinDisplay!)
      .filter(Boolean),
  );

  const password = row.password ?? (await generateNextPassword(eventId, roleSlug, usedPasswords));
  const passwordNum = parseInt(password, 10);
  if (!isPinInRoleSlugRange(passwordNum, roleSlug)) {
    throw new Error(`Password ${password} is not valid for this access profile`);
  }

  const pinHash = await hashPin(password);

  return prisma.user.create({
    data: {
      eventId,
      eventUserRoleId: eventUserRoleId!,
      pinHash,
      pinDisplay: password,
      loginPhrase: phrase,
      firstName: row.firstName,
      lastName: row.lastName,
      middleName: row.middleName ?? null,
      username,
      email,
    },
    include: { team: true, eventUserRole: true },
  });
}

export async function createEventAdminUser(
  eventId: string,
  data: { firstName: string; lastName: string },
) {
  return createUserFromRow(eventId, {
    firstName: data.firstName,
    lastName: data.lastName,
    role: "ADMIN",
  });
}

export function serializePlatformEventUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  pinDisplay: string | null;
  createdAt: Date;
  eventUserRole: { name: string };
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    password: user.pinDisplay ?? "",
    eventUserRoleName: user.eventUserRole.name,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializePlatformCreatedUser(user: {
  username: string;
  pinDisplay: string | null;
  firstName: string;
  lastName: string;
  eventUserRole: { name: string };
}) {
  return {
    username: user.username,
    password: user.pinDisplay ?? "",
    firstName: user.firstName,
    lastName: user.lastName,
    eventUserRoleName: user.eventUserRole.name,
  };
}

export function serializeUserRow(
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    teamId: string | null;
    checkedInAt: Date | null;
    createdAt: Date;
    loginPhrase: string | null;
    pinDisplay: string | null;
    team: { letter: string } | null;
    eventUserRole: { id: string; slug: string; name: string };
  },
  viewerPermissions: Permission[],
) {
  return {
    id: user.id,
    eventUserRoleId: user.eventUserRole.id,
    eventUserRoleSlug: user.eventUserRole.slug,
    eventUserRoleName: user.eventUserRole.name,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    loginPhrase: user.loginPhrase,
    password: canViewPassword(viewerPermissions, user.eventUserRole.slug, user.pinDisplay)
      ? user.pinDisplay
      : undefined,
  };
}

export { TEAM_LETTERS };
