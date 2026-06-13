import { prisma } from "@/lib/prisma";
import { BRAND_PRIMARY } from "@/lib/brand";
import { FIGMA_TEAMS } from "@/lib/figma-teams";
import { normalizeTeamCode, validateTeamCode } from "@/lib/team-codes";

export async function seedFigmaTeams(eventId: string) {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const team of FIGMA_TEAMS) {
    const existing = await prisma.team.findUnique({
      where: { eventId_letter: { eventId, letter: team.letter } },
    });
    if (existing) {
      skipped.push(team.letter);
      continue;
    }
    await prisma.team.create({
      data: { eventId, letter: team.letter, name: team.name, color: team.color },
    });
    created.push(team.letter);
  }

  const teams = await prisma.team.findMany({ where: { eventId }, orderBy: { letter: "asc" } });
  return { teams, created, skipped };
}

export async function deleteTeam(eventId: string, teamId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, eventId } });
  if (!team) throw new Error("Team not found");

  await prisma.$transaction([
    prisma.user.updateMany({ where: { teamId }, data: { teamId: null } }),
    prisma.message.deleteMany({ where: { teamId } }),
    prisma.score.deleteMany({ where: { teamId } }),
    prisma.spinSubmission.deleteMany({ where: { teamId } }),
    prisma.quizAnswer.updateMany({ where: { teamId }, data: { teamId: null } }),
    prisma.voteBallot.updateMany({ where: { teamId }, data: { teamId: null } }),
    prisma.team.delete({ where: { id: teamId } }),
  ]);
}

export function parseTeamInput(body: { letter?: string; name?: string; color?: string }) {
  const letter = normalizeTeamCode(body.letter ?? "");
  const name = body.name?.trim() ?? "";
  const color = body.color?.trim() || BRAND_PRIMARY;

  const letterError = validateTeamCode(letter);
  if (letterError) throw new Error(letterError);
  if (!name) throw new Error("Team name is required");

  return { letter, name, color };
}
