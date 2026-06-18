import type { Server as SocketIOServer } from "socket.io";
import { isChatSocialChallengeTitle } from "@/lib/chat-social-challenges";
import { prisma } from "@/lib/prisma";
import { postActivityChatMessage } from "@/lib/activity-chat-server";
import {
  checkWinner,
  EMPTY_BOARD,
  isBoardFull,
  type TicTacToeCell,
  type TicTacToeMark,
  type TicTacToeMatchSnapshot,
  type TicTacToeMode,
} from "@/lib/tic-tac-toe/types";
import { eventRoom, teamRoom, ticTacToeMatchRoom, userRoom } from "@/server/socket/rooms";
import { handleBracketGameResult } from "@/server/games/activityBracketEngine";
import { loadBracketMatchContext } from "@/lib/activity-bracket/match-context";
import { buildSocialTttSessionState } from "@/server/games/socialTttEngine";

function parseBoard(raw: unknown): TicTacToeCell[] {
  if (!Array.isArray(raw) || raw.length !== 9) return [...EMPTY_BOARD];
  return raw.map((c) => (c === "X" || c === "O" ? c : null));
}

function parseCouncilVotes(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && v >= 0 && v <= 8) out[k] = v;
  }
  return out;
}

function voteCounts(votes: Record<string, number>): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const cell of Object.values(votes)) {
    counts[cell] = (counts[cell] ?? 0) + 1;
  }
  return counts;
}

function teamInfo(team: { id: string; letter: string; name: string; color: string }) {
  return { id: team.id, letter: team.letter, name: team.name, color: team.color };
}

function userAsChampion(user: {
  id: string;
  account: { username: string; firstName: string; lastName: string };
}) {
  return {
    userId: user.id,
    username: user.account.username,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
  };
}

function socialPseudoTeam(
  user: { id: string; account: { firstName: string; lastName: string } },
  mark: TicTacToeMark,
) {
  const initial = user.account.firstName.trim().charAt(0).toUpperCase() || mark;
  return {
    id: user.id,
    letter: initial,
    name: `${user.account.firstName} ${user.account.lastName}`.trim(),
    color: mark === "X" ? "#f97316" : "#3b82f6",
  };
}

export async function buildTttSnapshot(matchId: string): Promise<TicTacToeMatchSnapshot | null> {
  const match = await prisma.ticTacToeMatch.findUnique({
    where: { id: matchId },
    include: {
      challenge: true,
      teamX: true,
      teamO: true,
      playerX: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      playerO: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      championX: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      championO: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      chatSession: {
        select: {
          id: true,
          kind: true,
          settings: true,
          scoreX: true,
          scoreO: true,
          turnDeadlineAt: true,
        },
      },
    },
  });
  if (!match) return null;

  const councilVotes = parseCouncilVotes(match.councilVotes);
  const bracket = match.isSocial ? null : await loadBracketMatchContext(match.bracketSlotId);

  const playerX = match.playerX ? userAsChampion(match.playerX) : null;
  const playerO = match.playerO ? userAsChampion(match.playerO) : null;

  const teamX =
    match.teamX && !match.isSocial
      ? teamInfo(match.teamX)
      : match.playerX
        ? socialPseudoTeam(match.playerX, "X")
        : { id: "", letter: "X", name: "Player X", color: "#f97316" };

  const teamO =
    match.teamO && !match.isSocial
      ? teamInfo(match.teamO)
      : match.playerO
        ? socialPseudoTeam(match.playerO, "O")
        : { id: "", letter: "O", name: "Player O", color: "#3b82f6" };

  const displayTitle =
    isChatSocialChallengeTitle(match.challenge.title) ? "X and O" : match.challenge.title;

  const socialTtt = match.chatSession
    ? buildSocialTttSessionState({
        kind: match.chatSession.kind,
        settings: match.chatSession.settings,
        scoreX: match.chatSession.scoreX,
        scoreO: match.chatSession.scoreO,
        turnDeadlineAt: match.chatSession.turnDeadlineAt,
        tttMatch: {
          state: match.state,
          currentTurn: match.currentTurn,
          playerXUserId: match.playerXUserId,
          playerOUserId: match.playerOUserId,
        },
      })
    : null;

  return {
    matchId: match.id,
    challengeId: match.challengeId,
    challengeTitle: displayTitle,
    mode: match.challenge.mode as TicTacToeMode,
    state: match.state as TicTacToeMatchSnapshot["state"],
    board: parseBoard(match.board),
    currentTurn: match.currentTurn as TicTacToeMark,
    turnNumber: match.turnNumber,
    teamX,
    teamO,
    championX: match.championX
      ? userAsChampion(match.championX)
      : playerX,
    championO: match.championO
      ? userAsChampion(match.championO)
      : playerO,
    councilVotes,
    councilVoteCounts: voteCounts(councilVotes),
    winnerTeamId: match.winnerTeamId,
    isDraw: match.isDraw,
    bracket,
    isSocial: match.isSocial,
    playerX,
    playerO,
    winnerUserId: match.winnerUserId,
    chatSessionId: match.chatSession?.id ?? null,
    socialTtt: socialTtt ?? undefined,
    serverNow: Date.now(),
  };
}

async function emitTttState(io: SocketIOServer, eventSlug: string, snapshot: TicTacToeMatchSnapshot) {
  const rooms = new Set<string>([ticTacToeMatchRoom(snapshot.matchId)]);

  if (snapshot.isSocial) {
    if (snapshot.playerX?.userId) rooms.add(userRoom(snapshot.playerX.userId));
    if (snapshot.playerO?.userId) rooms.add(userRoom(snapshot.playerO.userId));
  } else {
    rooms.add(teamRoom(eventSlug, snapshot.teamX.letter));
    rooms.add(teamRoom(eventSlug, snapshot.teamO.letter));
    rooms.add(eventRoom(eventSlug));
  }

  for (const room of rooms) {
    io.to(room).emit("ttt:state", snapshot);
  }
}

export async function broadcastTttState(io: SocketIOServer, matchId: string, eventSlug: string) {
  const snapshot = await buildTttSnapshot(matchId);
  if (!snapshot) return null;
  await emitTttState(io, eventSlug, snapshot);
  return snapshot;
}

export async function createTttMatch(
  challengeId: string,
  eventId: string,
  teamXId: string,
  teamOId: string,
) {
  if (teamXId === teamOId) throw new Error("Teams must be different.");

  const challenge = await prisma.ticTacToeChallenge.findFirst({
    where: { id: challengeId, eventId },
  });
  if (!challenge) throw new Error("Tournament not found.");

  if (challenge.competitionFormat === "CHAMPIONSHIP") {
    throw new Error("Use Start championship for bracket mode.");
  }

  return prisma.ticTacToeMatch.create({
    data: {
      challengeId,
      eventId,
      teamXId,
      teamOId,
      board: EMPTY_BOARD,
      state: "WAITING",
    },
    include: { teamX: true, teamO: true, challenge: true },
  });
}

export async function startTttMatch(
  io: SocketIOServer,
  matchId: string,
  eventId: string,
  eventSlug: string,
  hostUserId: string,
) {
  const match = await prisma.ticTacToeMatch.findFirst({
    where: { id: matchId, eventId },
    include: { challenge: true, teamX: true, teamO: true },
  });
  if (!match) throw new Error("Match not found.");
  if (match.state !== "WAITING") throw new Error("Match already started.");

  await prisma.ticTacToeMatch.update({
    where: { id: matchId },
    data: { state: "ACTIVE", councilVotes: {} },
  });

  if (!match.isSocial) {
    await postActivityChatMessage({
      eventId,
      eventSlug,
      authorUserId: hostUserId,
      body: {
        type: "activity",
        kind: "tic_tac_toe",
        sessionId: matchId,
        instanceId: match.challengeId,
        title: match.challenge.title,
        status: "live",
        action: "started",
        text: `Team ${match.teamX?.letter ?? "X"} vs Team ${match.teamO?.letter ?? "O"} — match is live.`,
        metadata: { matchId, teamXId: match.teamXId, teamOId: match.teamOId },
      },
      broadcastToAllChats: true,
    });
  }

  if (match.isSocial) {
    const { onSocialTttMatchStarted } = await import("@/server/games/socialTttEngine");
    await onSocialTttMatchStarted(io, matchId, eventSlug);
  }

  return broadcastTttState(io, matchId, eventSlug);
}

export async function setTttChampion(
  io: SocketIOServer,
  params: {
    matchId: string;
    eventId: string;
    eventSlug: string;
    userId: string;
    teamId: string;
    championUserId: string;
  },
) {
  const match = await prisma.ticTacToeMatch.findFirst({
    where: { id: params.matchId, eventId: params.eventId },
  });
  if (!match) throw new Error("Match not found.");
  if (match.state === "FINISHED") throw new Error("Match is finished.");

  const isX = match.teamXId === params.teamId;
  const isO = match.teamOId === params.teamId;
  if (!isX && !isO) throw new Error("Your team is not in this match.");

  const champion = await prisma.user.findFirst({
    where: { id: params.championUserId, teamId: params.teamId, eventId: params.eventId },
  });
  if (!champion) throw new Error("Champion must be on your team.");

  await prisma.ticTacToeMatch.update({
    where: { id: params.matchId },
    data: isX ? { championXUserId: params.championUserId } : { championOUserId: params.championUserId },
  });

  return broadcastTttState(io, params.matchId, params.eventSlug);
}

function currentTurnTeamId(match: { teamXId: string; teamOId: string; currentTurn: string }) {
  return match.currentTurn === "X" ? match.teamXId : match.teamOId;
}

async function applyMove(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
  cellIndex: number,
) {
  const match = await prisma.ticTacToeMatch.findUnique({ where: { id: matchId } });
  if (!match || match.state !== "ACTIVE") return null;

  const board = parseBoard(match.board);
  if (board[cellIndex] !== null) return null;

  board[cellIndex] = match.currentTurn as TicTacToeMark;
  const winner = checkWinner(board);
  const draw = !winner && isBoardFull(board);
  const nextTurn: TicTacToeMark = match.currentTurn === "X" ? "O" : "X";

  let winnerTeamId: string | null = null;
  let winnerUserId: string | null = null;
  if (winner === "X") {
    winnerTeamId = match.teamXId;
    winnerUserId = match.playerXUserId;
  }
  if (winner === "O") {
    winnerTeamId = match.teamOId;
    winnerUserId = match.playerOUserId;
  }

  const finished = Boolean(winner || draw);

  if (match.isSocial && finished) {
    await prisma.ticTacToeMatch.update({
      where: { id: matchId },
      data: {
        board,
        currentTurn: match.currentTurn,
        turnNumber: match.turnNumber + 1,
        councilVotes: {},
        winnerTeamId,
        winnerUserId: draw ? null : winnerUserId,
        isDraw: draw,
      },
    });

    const { handleSocialTttRoundEnd } = await import("@/server/games/socialTttEngine");
    await handleSocialTttRoundEnd(io, matchId, eventSlug, {
      winnerMark: winner,
      isDraw: draw,
    });
    return broadcastTttState(io, matchId, eventSlug);
  }

  await prisma.ticTacToeMatch.update({
    where: { id: matchId },
    data: {
      board,
      currentTurn: finished ? match.currentTurn : nextTurn,
      turnNumber: match.turnNumber + 1,
      councilVotes: {},
      state: finished ? "FINISHED" : "ACTIVE",
      winnerTeamId,
      winnerUserId: finished && !draw ? winnerUserId : null,
      isDraw: draw,
      finishedAt: finished ? new Date() : null,
    },
  });

  const snapshot = await broadcastTttState(io, matchId, eventSlug);

  if (!finished && match.isSocial) {
    const { onSocialTttMoveApplied } = await import("@/server/games/socialTttEngine");
    await onSocialTttMoveApplied(io, matchId, eventSlug);
  }

  if (finished && match.bracketSlotId) {
    await handleBracketGameResult(io, {
      gameType: "tic_tac_toe",
      bracketSlotId: match.bracketSlotId,
      winnerTeamId: draw ? null : winnerTeamId,
      isDraw: draw,
      eventId: match.eventId,
      eventSlug,
      finishedMatchId: matchId,
    });
  }

  return snapshot;
}

export async function handleTttMove(
  io: SocketIOServer,
  params: {
    matchId: string;
    eventId: string;
    eventSlug: string;
    userId: string;
    teamId: string | null;
    cellIndex: number;
  },
) {
  const match = await prisma.ticTacToeMatch.findFirst({
    where: { id: params.matchId, eventId: params.eventId },
    include: { challenge: true },
  });
  if (!match) throw new Error("Match not found.");
  if (match.state !== "ACTIVE") throw new Error("Match is not active.");
  if (params.cellIndex < 0 || params.cellIndex > 8) throw new Error("Invalid cell.");

  if (match.isSocial) {
    const turnUserId =
      match.currentTurn === "X" ? match.playerXUserId : match.playerOUserId;
    if (!turnUserId || params.userId !== turnUserId) {
      throw new Error("It is not your turn.");
    }
    return applyMove(io, params.matchId, params.eventSlug, params.cellIndex);
  }

  const turnTeamId = currentTurnTeamId({
    teamXId: match.teamXId!,
    teamOId: match.teamOId!,
    currentTurn: match.currentTurn,
  });
  if (!params.teamId || params.teamId !== turnTeamId) {
    throw new Error("It is not your team's turn.");
  }

  const mode = match.challenge.mode as TicTacToeMode;

  if (mode === "CHAMPION") {
    const championId =
      match.currentTurn === "X" ? match.championXUserId : match.championOUserId;
    if (!championId) throw new Error("Your team must pick a champion first.");
    if (params.userId !== championId) throw new Error("Only the team champion can move.");
    return applyMove(io, params.matchId, params.eventSlug, params.cellIndex);
  }

  // Council mode: vote; apply when majority of team members voted for same cell
  const votes = parseCouncilVotes(match.councilVotes);
  votes[params.userId] = params.cellIndex;

  const teamMembers = await prisma.user.count({ where: { teamId: params.teamId, eventId: params.eventId } });
  const counts = voteCounts(votes);
  const majority = Math.ceil(teamMembers / 2);

  let winningCell: number | null = null;
  for (const [cell, count] of Object.entries(counts)) {
    if (count >= majority) {
      winningCell = Number(cell);
      break;
    }
  }

  if (winningCell === null) {
    await prisma.ticTacToeMatch.update({
      where: { id: params.matchId },
      data: { councilVotes: votes },
    });
    return broadcastTttState(io, params.matchId, params.eventSlug);
  }

  return applyMove(io, params.matchId, params.eventSlug, winningCell);
}

export async function listTttMatchesForEvent(eventId: string, challengeId?: string) {
  return prisma.ticTacToeMatch.findMany({
    where: { eventId, ...(challengeId ? { challengeId } : {}) },
    include: { teamX: true, teamO: true, challenge: true },
    orderBy: { createdAt: "desc" },
  });
}
