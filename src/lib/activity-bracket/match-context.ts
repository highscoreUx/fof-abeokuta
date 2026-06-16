import { prisma } from "@/lib/prisma";
import type { BracketMatchContext } from "@/lib/activity-bracket/types";

export async function loadBracketMatchContext(
  bracketSlotId: string | null | undefined,
): Promise<BracketMatchContext | null> {
  if (!bracketSlotId) return null;

  const slot = await prisma.activityBracketSlot.findUnique({
    where: { id: bracketSlotId },
    include: { round: { include: { bracket: true } } },
  });
  if (!slot) return null;

  return {
    roundNumber: slot.round.roundNumber,
    teamAWins: slot.teamAWins,
    teamBWins: slot.teamBWins,
    targetWins: slot.round.bracket.targetWins,
  };
}

