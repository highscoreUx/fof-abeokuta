import type { Role } from "@/types";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/bcrypt";
import { shufflePhrases } from "@/lib/design-phrases";
import {
  formatEmail,
  getPinRangeForRole,
  isPinInRoleRange,
  slugifyFirstName,
} from "@/lib/permissions";
import type { AuthUser } from "@/types";

const TEAM_LETTERS = ["F", "I", "G", "M", "A"];

export function serializeUser(
  user: {
    id: string;
    role: Role;
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
  },
  eventSlug: string,
): AuthUser & { loginPhrase?: string | null; passwordDisplay?: string | null } {
  return {
    id: user.id,
    role: user.role,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName,
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    eventId: user.eventId,
    eventSlug,
    loginPhrase: user.loginPhrase,
    passwordDisplay: user.pinDisplay,
  };
}

export async function findUserByCredentials(
  eventId: string,
  username: string,
  password: string,
) {
  const normalized = username.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { eventId_username: { eventId, username: normalized } },
    include: { team: true },
  });

  if (!user) return null;

  const { verifyPin } = await import("@/lib/auth/bcrypt");
  if (!(await verifyPin(password, user.pinHash))) return null;

  const passwordNum = parseInt(password, 10);
  if (!Number.isNaN(passwordNum) && !isPinInRoleRange(passwordNum, user.role)) {
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
  role: Role,
  usedPasswords: Set<string>,
): Promise<string> {
  const { min, max } = getPinRangeForRole(role);
  for (let i = 0; i < 5000; i++) {
    const password = String(Math.floor(Math.random() * (max - min + 1)) + min).padStart(4, "0");
    if (!usedPasswords.has(password)) return password;
  }
  throw new Error(`No available passwords for role ${role}`);
}

export async function assignTeamsBalanced(eventId: string, userIds?: string[]) {
  const teams = await prisma.team.findMany({ where: { eventId }, orderBy: { letter: "asc" } });
  if (teams.length === 0) throw new Error("Teams not seeded");

  const users = await prisma.user.findMany({
    where: {
      eventId,
      role: "PARTICIPANT",
      ...(userIds ? { id: { in: userIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const shuffled = [...users].sort(() => Math.random() - 0.5);
  const teamCounts = new Map(teams.map((t) => [t.id, 0]));

  for (const user of shuffled) {
    const team = teams.reduce((min, t) =>
      (teamCounts.get(t.id) ?? 0) < (teamCounts.get(min.id) ?? 0) ? t : min,
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { teamId: team.id },
    });
    teamCounts.set(team.id, (teamCounts.get(team.id) ?? 0) + 1);
  }

  return prisma.user.findMany({
    where: { id: { in: shuffled.map((u) => u.id) } },
    include: { team: true },
  });
}

export async function createUserFromRow(
  eventId: string,
  row: {
    firstName: string;
    lastName: string;
    middleName?: string;
    role: Role;
    password?: string;
  },
) {
  const { username, phrase, email } = await allocateLoginIdentity(eventId, row.firstName);

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

  const password = row.password ?? (await generateNextPassword(eventId, row.role, usedPasswords));
  const passwordNum = parseInt(password, 10);
  if (!isPinInRoleRange(passwordNum, row.role)) {
    throw new Error(`Password ${password} is not valid for role ${row.role}`);
  }

  const pinHash = await hashPin(password);

  return prisma.user.create({
    data: {
      eventId,
      role: row.role,
      pinHash,
      pinDisplay: password,
      loginPhrase: phrase,
      firstName: row.firstName,
      lastName: row.lastName,
      middleName: row.middleName ?? null,
      username,
      email,
    },
    include: { team: true },
  });
}

export { TEAM_LETTERS };
