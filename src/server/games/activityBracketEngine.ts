import type { Server as SocketIOServer } from "socket.io";
import { prisma } from "@/lib/prisma";
import { pairTeamsForRound } from "@/lib/activity-bracket/pairing";
import type {
  ActivityBracketGameType,
  ActivityBracketSnapshot,
  BracketRoundSnapshot,
  BracketSlotSnapshot,
  BracketTeamInfo,
} from "@/lib/activity-bracket/types";
import { EMPTY_BOARD } from "@/lib/tic-tac-toe/types";
import { eventRoom } from "@/server/socket/rooms";
import { broadcastHangmanState } from "@/server/games/hangmanEngine";
import { broadcastTttState } from "@/server/games/ticTacToeEngine";

function teamInfo(team: { id: string; letter: string; name: string; color: string }): BracketTeamInfo {
  return { id: team.id, letter: team.letter, name: team.name, color: team.color };
}

async function loadBracketOrThrow(bracketId: string) {
  const bracket = await prisma.activityBracket.findUnique({
    where: { id: bracketId },
    include: {
      championTeam: true,
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          slots: {
            include: {
              teamA: true,
              teamB: true,
              winnerTeam: true,
              tttMatches: {
                where: { state: { in: ["WAITING", "ACTIVE"] } },
                select: { id: true },
                take: 1,
                orderBy: { createdAt: "desc" },
              },
              hangmanMatches: {
                where: { state: { in: ["WAITING", "ACTIVE"] } },
                select: { id: true },
                take: 1,
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });
  if (!bracket) throw new Error("Bracket not found.");
  return bracket;
}

function resolveChallengeId(bracket: {
  gameType: string;
  tttChallengeId: string | null;
  hangmanChallengeId: string | null;
}): string {
  const id =
    bracket.gameType === "tic_tac_toe" ? bracket.tttChallengeId : bracket.hangmanChallengeId;
  if (!id) throw new Error("Bracket challenge missing.");
  return id;
}

export async function buildActivityBracketSnapshot(
  bracketId: string,
): Promise<ActivityBracketSnapshot | null> {
  const bracket = await loadBracketOrThrow(bracketId);
  const gameType = bracket.gameType as ActivityBracketGameType;

  const rounds: BracketRoundSnapshot[] = bracket.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    state: round.state as BracketRoundSnapshot["state"],
    slots: round.slots.map((slot): BracketSlotSnapshot => {
      const activeMatchId =
        gameType === "tic_tac_toe"
          ? (slot.tttMatches[0]?.id ?? null)
          : (slot.hangmanMatches[0]?.id ?? null);

      return {
        slotId: slot.id,
        teamA: teamInfo(slot.teamA),
        teamB: slot.teamB ? teamInfo(slot.teamB) : null,
        teamAWins: slot.teamAWins,
        teamBWins: slot.teamBWins,
        targetWins: bracket.targetWins,
        winnerTeamId: slot.winnerTeamId,
        isBye: slot.isBye,
        state: slot.state as BracketSlotSnapshot["state"],
        activeMatchId,
      };
    }),
  }));

  return {
    bracketId: bracket.id,
    challengeId: resolveChallengeId(bracket),
    gameType,
    state: bracket.state as ActivityBracketSnapshot["state"],
    targetWins: bracket.targetWins,
    currentRound: bracket.currentRound,
    championTeam: bracket.championTeam ? teamInfo(bracket.championTeam) : null,
    rounds,
    serverNow: Date.now(),
  };
}

export async function broadcastActivityBracketState(
  io: SocketIOServer,
  bracketId: string,
  eventSlug: string,
) {
  const snapshot = await buildActivityBracketSnapshot(bracketId);
  if (!snapshot) return null;
  io.to(eventRoom(eventSlug)).emit("bracket:state", snapshot);
  return snapshot;
}

async function createGameMatchForSlot(params: {
  gameType: ActivityBracketGameType;
  eventId: string;
  challengeId: string;
  slotId: string;
  teamAId: string;
  teamBId: string;
}) {
  if (params.gameType === "tic_tac_toe") {
    return prisma.ticTacToeMatch.create({
      data: {
        challengeId: params.challengeId,
        eventId: params.eventId,
        teamXId: params.teamAId,
        teamOId: params.teamBId,
        board: EMPTY_BOARD,
        state: "WAITING",
        bracketSlotId: params.slotId,
      },
    });
  }

  return prisma.hangmanMatch.create({
    data: {
      challengeId: params.challengeId,
      eventId: params.eventId,
      teamXId: params.teamAId,
      teamOId: params.teamBId,
      state: "WAITING",
      bracketSlotId: params.slotId,
    },
  });
}

async function activateSlotMatch(
  io: SocketIOServer,
  params: {
    gameType: ActivityBracketGameType;
    eventId: string;
    eventSlug: string;
    challengeId: string;
    slotId: string;
    teamAId: string;
    teamBId: string;
  },
) {
  const existing =
    params.gameType === "tic_tac_toe"
      ? await prisma.ticTacToeMatch.findFirst({
          where: {
            bracketSlotId: params.slotId,
            state: { in: ["WAITING", "ACTIVE"] },
          },
        })
      : await prisma.hangmanMatch.findFirst({
          where: {
            bracketSlotId: params.slotId,
            state: { in: ["WAITING", "ACTIVE"] },
          },
        });

  if (existing) return existing;

  return createGameMatchForSlot(params);
}

async function createRoundWithPairings(
  bracketId: string,
  roundNumber: number,
  teamIds: string[],
) {
  const pairings = pairTeamsForRound(teamIds);

  const round = await prisma.activityBracketRound.create({
    data: {
      bracketId,
      roundNumber,
      state: "ACTIVE",
      slots: {
        create: pairings.map((pairing) => ({
          teamAId: pairing.teamAId,
          teamBId: pairing.teamBId,
          isBye: pairing.isBye,
          state: pairing.isBye ? "COMPLETE" : "ACTIVE",
          winnerTeamId: pairing.isBye ? pairing.teamAId : null,
        })),
      },
    },
    include: { slots: true },
  });

  return { round, pairings };
}

export async function startActivityChampionship(
  io: SocketIOServer,
  params: {
    gameType: ActivityBracketGameType;
    challengeId: string;
    eventId: string;
    eventSlug: string;
    targetWins: number;
  },
) {
  const existing = await prisma.activityBracket.findFirst({
    where:
      params.gameType === "tic_tac_toe"
        ? { tttChallengeId: params.challengeId }
        : { hangmanChallengeId: params.challengeId },
  });
  if (existing && existing.state !== "SETUP") {
    throw new Error("Championship already started.");
  }

  const teams = await prisma.team.findMany({
    where: { eventId: params.eventId },
    select: { id: true },
    orderBy: { letter: "asc" },
  });
  if (teams.length < 2) {
    throw new Error("Need at least two teams to start a championship.");
  }

  const targetWins = Math.max(1, Math.min(20, params.targetWins));

  const bracket = existing
    ? await prisma.activityBracket.update({
        where: { id: existing.id },
        data: {
          state: "ACTIVE",
          targetWins,
          currentRound: 1,
          championTeamId: null,
        },
      })
    : await prisma.activityBracket.create({
        data: {
          eventId: params.eventId,
          gameType: params.gameType,
          tttChallengeId: params.gameType === "tic_tac_toe" ? params.challengeId : null,
          hangmanChallengeId: params.gameType === "hangman" ? params.challengeId : null,
          state: "ACTIVE",
          targetWins,
          currentRound: 1,
        },
      });

  if (existing) {
    await prisma.activityBracketRound.deleteMany({ where: { bracketId: bracket.id } });
  }

  const { round } = await createRoundWithPairings(
    bracket.id,
    1,
    teams.map((t) => t.id),
  );

  for (const slot of round.slots) {
    if (slot.isBye || !slot.teamBId) continue;
    await activateSlotMatch(io, {
      gameType: params.gameType,
      eventId: params.eventId,
      eventSlug: params.eventSlug,
      challengeId: params.challengeId,
      slotId: slot.id,
      teamAId: slot.teamAId,
      teamBId: slot.teamBId,
    });
  }

  await maybeAdvanceRound(io, bracket.id, params.eventId, params.eventSlug, params.gameType);

  return broadcastActivityBracketState(io, bracket.id, params.eventSlug);
}

async function maybeAdvanceRound(
  io: SocketIOServer,
  bracketId: string,
  eventId: string,
  eventSlug: string,
  gameType: ActivityBracketGameType,
) {
  const bracket = await loadBracketOrThrow(bracketId);
  const currentRound = bracket.rounds.find((r) => r.roundNumber === bracket.currentRound);
  if (!currentRound) return;

  const allComplete = currentRound.slots.every((s) => s.state === "COMPLETE");
  if (!allComplete) return;

  await prisma.activityBracketRound.update({
    where: { id: currentRound.id },
    data: { state: "COMPLETE" },
  });

  const advancingTeamIds = currentRound.slots
    .map((s) => s.winnerTeamId)
    .filter((id): id is string => Boolean(id));

  if (advancingTeamIds.length === 1) {
    await prisma.activityBracket.update({
      where: { id: bracketId },
      data: {
        state: "FINISHED",
        championTeamId: advancingTeamIds[0],
      },
    });
    return broadcastActivityBracketState(io, bracketId, eventSlug);
  }

  const nextRoundNumber = bracket.currentRound + 1;
  await prisma.activityBracket.update({
    where: { id: bracketId },
    data: { currentRound: nextRoundNumber },
  });

  const challengeId = resolveChallengeId(bracket);
  const { round } = await createRoundWithPairings(
    bracketId,
    nextRoundNumber,
    advancingTeamIds,
  );

  for (const slot of round.slots) {
    if (slot.isBye || !slot.teamBId) continue;
    await activateSlotMatch(io, {
      gameType,
      eventId,
      eventSlug,
      challengeId,
      slotId: slot.id,
      teamAId: slot.teamAId,
      teamBId: slot.teamBId,
    });
  }

  await maybeAdvanceRound(io, bracketId, eventId, eventSlug, gameType);
}

export async function handleBracketGameResult(
  io: SocketIOServer,
  params: {
    gameType: ActivityBracketGameType;
    bracketSlotId: string;
    winnerTeamId: string | null;
    isDraw: boolean;
    eventId: string;
    eventSlug: string;
    finishedMatchId: string;
  },
) {
  const slot = await prisma.activityBracketSlot.findUnique({
    where: { id: params.bracketSlotId },
    include: {
      round: { include: { bracket: true } },
      teamA: true,
      teamB: true,
    },
  });
  if (!slot || slot.state === "COMPLETE") return;

  const bracket = slot.round.bracket;
  const challengeId = resolveChallengeId(bracket);
  const gameType = bracket.gameType as ActivityBracketGameType;

  if (params.isDraw || !params.winnerTeamId) {
    await createGameMatchForSlot({
      gameType,
      eventId: params.eventId,
      challengeId,
      slotId: slot.id,
      teamAId: slot.teamAId,
      teamBId: slot.teamBId!,
    });
    await broadcastActivityBracketState(io, bracket.id, params.eventSlug);
    return;
  }

  const isTeamA = params.winnerTeamId === slot.teamAId;
  const isTeamB = params.winnerTeamId === slot.teamBId;
  if (!isTeamA && !isTeamB) return;

  const teamAWins = slot.teamAWins + (isTeamA ? 1 : 0);
  const teamBWins = slot.teamBWins + (isTeamB ? 1 : 0);

  if (teamAWins >= bracket.targetWins || teamBWins >= bracket.targetWins) {
    const slotWinnerId = teamAWins >= bracket.targetWins ? slot.teamAId : slot.teamBId!;
    await prisma.activityBracketSlot.update({
      where: { id: slot.id },
      data: {
        teamAWins,
        teamBWins,
        winnerTeamId: slotWinnerId,
        state: "COMPLETE",
      },
    });
  } else {
    await prisma.activityBracketSlot.update({
      where: { id: slot.id },
      data: { teamAWins, teamBWins },
    });
    await createGameMatchForSlot({
      gameType,
      eventId: params.eventId,
      challengeId,
      slotId: slot.id,
      teamAId: slot.teamAId,
      teamBId: slot.teamBId!,
    });
  }

  await broadcastActivityBracketState(io, bracket.id, params.eventSlug);
  await maybeAdvanceRound(io, bracket.id, params.eventId, params.eventSlug, gameType);

  if (gameType === "tic_tac_toe") {
    await broadcastTttState(io, params.finishedMatchId, params.eventSlug);
  } else {
    await broadcastHangmanState(io, params.finishedMatchId, params.eventSlug);
  }
}

export async function getBracketForChallenge(
  gameType: ActivityBracketGameType,
  challengeId: string,
) {
  return prisma.activityBracket.findFirst({
    where:
      gameType === "tic_tac_toe"
        ? { tttChallengeId: challengeId }
        : { hangmanChallengeId: challengeId },
  });
}
