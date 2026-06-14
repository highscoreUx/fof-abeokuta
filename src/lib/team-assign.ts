import { isTeamAssignableMember } from "@/lib/account-permissions";
import { resolveUserRolePermissions } from "@/lib/user-permissions";
import { isTeamingEnabled } from "@/lib/team-settings";
import { prisma } from "@/lib/prisma";

export const TEAM_ASSIGN_ALGORITHMS = [
  "balanced_random",
  "round_robin",
  "alphabetical_round_robin",
  "checked_in_balanced",
  "random",
] as const;

export type TeamAssignAlgorithm = (typeof TEAM_ASSIGN_ALGORITHMS)[number];

export interface TeamAssignSettings {
  algorithm: TeamAssignAlgorithm;
  autoAssignOnImport: boolean;
  onlyUnassigned: boolean;
  includeStaff: boolean;
}

const DEFAULT_SETTINGS: TeamAssignSettings = {
  algorithm: "balanced_random",
  autoAssignOnImport: true,
  onlyUnassigned: false,
  includeStaff: false,
};

const SETTING_KEYS = {
  algorithm: "team_assign_algorithm",
  autoAssignOnImport: "team_auto_assign_on_import",
  onlyUnassigned: "team_assign_only_unassigned",
  includeStaff: "team_assign_include_staff",
} as const;

/** @deprecated permissions-based assignment uses isTeamAssignableMember */
export function assignableTeamRoleSlugs(includeStaff: boolean): string[] {
  return includeStaff ? ["participant", "staff"] : ["participant"];
}

export function isTeamAssignAlgorithm(value: string): value is TeamAssignAlgorithm {
  return (TEAM_ASSIGN_ALGORITHMS as readonly string[]).includes(value);
}

export async function getTeamAssignSettings(eventId: string): Promise<TeamAssignSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      eventId,
      key: { in: Object.values(SETTING_KEYS) },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const algorithm = map[SETTING_KEYS.algorithm];
  return {
    algorithm: algorithm && isTeamAssignAlgorithm(algorithm) ? algorithm : DEFAULT_SETTINGS.algorithm,
    autoAssignOnImport: map[SETTING_KEYS.autoAssignOnImport] !== "false",
    onlyUnassigned: map[SETTING_KEYS.onlyUnassigned] === "true",
    includeStaff: map[SETTING_KEYS.includeStaff] === "true",
  };
}

export async function saveTeamAssignSettings(
  eventId: string,
  settings: Partial<TeamAssignSettings>,
): Promise<TeamAssignSettings> {
  if (settings.algorithm !== undefined) {
    if (!isTeamAssignAlgorithm(settings.algorithm)) {
      throw new Error("Invalid team assignment algorithm");
    }
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId, key: SETTING_KEYS.algorithm } },
      create: { eventId, key: SETTING_KEYS.algorithm, value: settings.algorithm },
      update: { value: settings.algorithm },
    });
  }

  if (settings.autoAssignOnImport !== undefined) {
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId, key: SETTING_KEYS.autoAssignOnImport } },
      create: {
        eventId,
        key: SETTING_KEYS.autoAssignOnImport,
        value: String(settings.autoAssignOnImport),
      },
      update: { value: String(settings.autoAssignOnImport) },
    });
  }

  if (settings.onlyUnassigned !== undefined) {
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId, key: SETTING_KEYS.onlyUnassigned } },
      create: { eventId, key: SETTING_KEYS.onlyUnassigned, value: String(settings.onlyUnassigned) },
      update: { value: String(settings.onlyUnassigned) },
    });
  }

  if (settings.includeStaff !== undefined) {
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId, key: SETTING_KEYS.includeStaff } },
      create: { eventId, key: SETTING_KEYS.includeStaff, value: String(settings.includeStaff) },
      update: { value: String(settings.includeStaff) },
    });
  }

  return getTeamAssignSettings(eventId);
}

interface AssignOptions {
  userIds?: string[];
  algorithm?: TeamAssignAlgorithm;
  onlyUnassigned?: boolean;
  includeStaff?: boolean;
}

function pickBalancedTeam<T extends { id: string }>(
  teams: T[],
  teamCounts: Map<string, number>,
): T {
  return teams.reduce((min, team) =>
    (teamCounts.get(team.id) ?? 0) < (teamCounts.get(min.id) ?? 0) ? team : min,
  );
}

function totalAssignedCount(teamCounts: Map<string, number>) {
  let total = 0;
  for (const count of teamCounts.values()) total += count;
  return total;
}

async function loadExistingTeamCounts(
  eventId: string,
  teams: Array<{ id: string }>,
  includeStaff: boolean,
  excludeUserIds: string[],
) {
  const teamCounts = new Map(teams.map((team) => [team.id, 0]));
  const assigned = await prisma.user.findMany({
    where: {
      eventId,
      teamId: { not: null },
      ...(excludeUserIds.length > 0 ? { id: { notIn: excludeUserIds } } : {}),
    },
    include: { account: true },
  });

  for (const user of assigned) {
    if (!user.teamId || !teamCounts.has(user.teamId)) continue;
    if (!isTeamAssignableMember(resolveUserRolePermissions(user), includeStaff)) continue;
    teamCounts.set(user.teamId, (teamCounts.get(user.teamId) ?? 0) + 1);
  }

  return teamCounts;
}

export async function assignTeams(eventId: string, options: AssignOptions = {}) {
  if (!(await isTeamingEnabled(eventId))) {
    throw new Error("Teaming is disabled for this event");
  }

  const settings = await getTeamAssignSettings(eventId);
  const algorithm = options.algorithm ?? settings.algorithm;
  const onlyUnassigned = options.onlyUnassigned ?? settings.onlyUnassigned;
  const includeStaff = options.includeStaff ?? settings.includeStaff;
  const teams = await prisma.team.findMany({ where: { eventId }, orderBy: { letter: "asc" } });
  if (teams.length === 0) throw new Error("No teams configured");

  const allCandidates = await prisma.user.findMany({
    where: {
      eventId,
      ...(options.userIds ? { id: { in: options.userIds } } : {}),
      ...(onlyUnassigned ? { teamId: null } : {}),
    },
    include: { account: true },
    orderBy: { createdAt: "asc" },
  });

  const users = allCandidates.filter((user) =>
    isTeamAssignableMember(resolveUserRolePermissions(user), includeStaff),
  );

  if (users.length === 0) {
    return [];
  }

  const teamCounts = await loadExistingTeamCounts(
    eventId,
    teams,
    includeStaff,
    users.map((user) => user.id),
  );

  const assignUser = async (userId: string, teamId: string) => {
    await prisma.user.update({ where: { id: userId }, data: { teamId } });
    teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
  };

  switch (algorithm) {
    case "random": {
      for (const user of users) {
        const team = teams[Math.floor(Math.random() * teams.length)];
        await assignUser(user.id, team.id);
      }
      break;
    }
    case "round_robin": {
      const offset = totalAssignedCount(teamCounts) % teams.length;
      for (let i = 0; i < users.length; i++) {
        await assignUser(users[i].id, teams[(offset + i) % teams.length].id);
      }
      break;
    }
    case "alphabetical_round_robin": {
      const sorted = [...users].sort((a, b) => {
        const last = a.account.lastName.localeCompare(b.account.lastName);
        return last !== 0 ? last : a.account.firstName.localeCompare(b.account.firstName);
      });
      const offset = totalAssignedCount(teamCounts) % teams.length;
      for (let i = 0; i < sorted.length; i++) {
        await assignUser(sorted[i].id, teams[(offset + i) % teams.length].id);
      }
      break;
    }
    case "checked_in_balanced": {
      const checkedIn = users
        .filter((u) => u.checkedInAt)
        .sort((a, b) => (a.checkedInAt?.getTime() ?? 0) - (b.checkedInAt?.getTime() ?? 0));
      const notCheckedIn = users.filter((u) => !u.checkedInAt);
      const ordered = [...checkedIn, ...notCheckedIn];

      for (const user of ordered) {
        const team = pickBalancedTeam(teams, teamCounts);
        await assignUser(user.id, team.id);
      }
      break;
    }
    case "balanced_random":
    default: {
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      for (const user of shuffled) {
        const team = pickBalancedTeam(teams, teamCounts);
        await assignUser(user.id, team.id);
      }
      break;
    }
  }

  return prisma.user.findMany({
    where: { id: { in: users.map((u) => u.id) } },
    include: { team: true, account: true },
  });
}

/** @deprecated Use assignTeams */
export const assignTeamsBalanced = assignTeams;
