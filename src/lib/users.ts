import type { Role } from "@/types";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/bcrypt";
import {
  formatEmail,
  formatUsername,
  getPinRangeForRole,
  isPinInRoleRange,
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
    team?: { letter: string } | null;
    pinDisplay?: string | null;
  },
  eventSlug: string,
): AuthUser & { pinDisplay?: string | null } {
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
    pinDisplay: user.pinDisplay,
  };
}

export async function findUserByPin(eventId: string, pin: string) {
  const pinNum = parseInt(pin, 10);
  let role: Role | null = null;

  if (pinNum >= 0 && pinNum <= 999) role = "ADMIN";
  else if (pinNum >= 1000 && pinNum <= 1999) role = "STAFF";
  else if (pinNum >= 2000 && pinNum <= 2999) role = "JUDGE";
  else if (pinNum >= 3000 && pinNum <= 3999) role = "PARTICIPANT";

  if (!role) return null;

  const users = await prisma.user.findMany({
    where: { eventId, role },
    include: { team: true },
  });

  const { verifyPin } = await import("@/lib/auth/bcrypt");
  for (const user of users) {
    if (await verifyPin(pin, user.pinHash)) {
      return user;
    }
  }

  return null;
}

export async function generateNextPin(eventId: string, role: Role, usedPins: Set<string>): Promise<string> {
  const { min, max } = getPinRangeForRole(role);
  for (let i = 0; i < 5000; i++) {
    const pin = String(Math.floor(Math.random() * (max - min + 1)) + min).padStart(4, "0");
    if (!usedPins.has(pin)) return pin;
  }
  throw new Error(`No available PINs for role ${role}`);
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
    pin?: string;
  },
) {
  const username = formatUsername(row.firstName, row.lastName, row.middleName);
  const email = formatEmail(username);

  const existing = await prisma.user.findFirst({
    where: { eventId, OR: [{ username }, { email }] },
  });
  if (existing) {
    throw new Error(`User already exists: ${username}`);
  }

  const usedPins = new Set(
    (
      await prisma.user.findMany({
        where: { eventId, pinDisplay: { not: null } },
        select: { pinDisplay: true },
      })
    )
      .map((u) => u.pinDisplay!)
      .filter(Boolean),
  );

  const pin = row.pin ?? (await generateNextPin(eventId, row.role, usedPins));
  const pinNum = parseInt(pin, 10);
  if (!isPinInRoleRange(pinNum, row.role)) {
    throw new Error(`PIN ${pin} is not valid for role ${row.role}`);
  }

  const pinHash = await hashPin(pin);

  return prisma.user.create({
    data: {
      eventId,
      role: row.role,
      pinHash,
      pinDisplay: pin,
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
