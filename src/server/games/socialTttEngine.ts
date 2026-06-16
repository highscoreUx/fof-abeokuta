import type { Server as SocketIOServer } from "socket.io";
import {
  DEFAULT_SOCIAL_TTT_SETTINGS,
  normalizeSocialTttSettingsInput,
  parseSocialTttScore,
  parseSocialTttSettings,
  type SocialTttSettings,
} from "@/lib/chat-game-ttt-settings";
import type { SocialTttSessionState } from "@/lib/chat-game-ttt-types";
import { EMPTY_BOARD } from "@/lib/tic-tac-toe/types";
import { prisma } from "@/lib/prisma";

const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function loadChatSessionForMatch(matchId: string) {
  return prisma.chatGameSession.findFirst({
    where: { tttMatchId: matchId },
    include: {
      participants: { where: { role: "player" } },
    },
  });
}

export function buildSocialTttSessionState(session: {
  kind: string;
  settings: unknown;
  scoreX: number;
  scoreO: number;
  turnDeadlineAt: Date | null;
  tttMatch?: {
    state: string;
    currentTurn: string;
    playerXUserId: string | null;
    playerOUserId: string | null;
  } | null;
}): SocialTttSessionState | null {
  if (session.kind !== "tic_tac_toe") return null;

  const settings = parseSocialTttSettings(session.settings);
  const score = parseSocialTttScore({ x: session.scoreX, o: session.scoreO });
  const turnDeadlineAt = session.turnDeadlineAt?.getTime() ?? null;

  let turnUserId: string | null = null;
  if (session.tttMatch?.state === "ACTIVE") {
    turnUserId =
      session.tttMatch.currentTurn === "X"
        ? session.tttMatch.playerXUserId
        : session.tttMatch.playerOUserId;
  }

  return { settings, score, turnDeadlineAt, turnUserId };
}

export function clearSocialTttTurnTimer(sessionId: string) {
  const timer = turnTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(sessionId);
  }
}

export async function scheduleSocialTttTurnTimer(
  io: SocketIOServer,
  params: {
    sessionId: string;
    matchId: string;
    eventSlug: string;
    settings: SocialTttSettings;
  },
) {
  clearSocialTttTurnTimer(params.sessionId);

  if (!params.settings.turnTimerEnabled) {
    await prisma.chatGameSession.update({
      where: { id: params.sessionId },
      data: { turnDeadlineAt: null },
    });
    return;
  }

  const deadline = new Date(Date.now() + params.settings.turnTimerSeconds * 1000);
  await prisma.chatGameSession.update({
    where: { id: params.sessionId },
    data: { turnDeadlineAt: deadline },
  });

  const delayMs = params.settings.turnTimerSeconds * 1000;
  const timer = setTimeout(() => {
    void expireSocialTttTurn(io, params.sessionId, params.matchId, params.eventSlug);
  }, delayMs);
  turnTimers.set(params.sessionId, timer);

  const { broadcastTttState } = await import("@/server/games/ticTacToeEngine");
  await broadcastTttState(io, params.matchId, params.eventSlug);
  const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
  await broadcastChatGameSession(io, params.eventSlug, params.sessionId);
}

async function expireSocialTttTurn(
  io: SocketIOServer,
  sessionId: string,
  matchId: string,
  eventSlug: string,
) {
  turnTimers.delete(sessionId);

  const match = await prisma.ticTacToeMatch.findUnique({ where: { id: matchId } });
  if (!match || match.state !== "ACTIVE" || !match.isSocial) return;

  const session = await prisma.chatGameSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const settings = parseSocialTttSettings(session.settings);
  if (!settings.turnTimerEnabled) return;

  const nextTurn = match.currentTurn === "X" ? "O" : "X";
  await prisma.ticTacToeMatch.update({
    where: { id: matchId },
    data: {
      currentTurn: nextTurn,
      turnNumber: match.turnNumber + 1,
      councilVotes: {},
    },
  });

  await scheduleSocialTttTurnTimer(io, {
    sessionId,
    matchId,
    eventSlug,
    settings,
  });
}

async function startNextSocialTttRound(
  io: SocketIOServer,
  params: {
    matchId: string;
    eventSlug: string;
    sessionId: string;
    startingTurn: "X" | "O";
  },
) {
  await prisma.ticTacToeMatch.update({
    where: { id: params.matchId },
    data: {
      board: EMPTY_BOARD,
      state: "ACTIVE",
      currentTurn: params.startingTurn,
      turnNumber: 0,
      councilVotes: {},
      winnerTeamId: null,
      winnerUserId: null,
      isDraw: false,
      finishedAt: null,
    },
  });

  const session = await prisma.chatGameSession.findUnique({ where: { id: params.sessionId } });
  if (!session) return;

  const settings = parseSocialTttSettings(session.settings);
  await scheduleSocialTttTurnTimer(io, {
    sessionId: params.sessionId,
    matchId: params.matchId,
    eventSlug: params.eventSlug,
    settings,
  });

  const { updateSessionMessage, broadcastChatGameSession } = await import(
    "@/server/games/chatGameEngine"
  );
  const refreshed = await prisma.chatGameSession.findUnique({
    where: { id: params.sessionId },
    include: {
      host: { include: { account: true } },
      participants: { include: { user: { include: { account: true } } } },
      team: { select: { id: true, letter: true } },
      tttMatch: {
        select: {
          challengeId: true,
          state: true,
          currentTurn: true,
          playerXUserId: true,
          playerOUserId: true,
        },
      },
      hangmanMatch: { select: { challengeId: true } },
      spinnerSession: { select: { challengeId: true } },
    },
  });
  if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);
  await broadcastChatGameSession(io, params.eventSlug, params.sessionId);
  const { broadcastTttState } = await import("@/server/games/ticTacToeEngine");
  await broadcastTttState(io, params.matchId, params.eventSlug);
}

export async function handleSocialTttRoundEnd(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
  result: { winnerMark: "X" | "O" | null; isDraw: boolean },
) {
  const session = await loadChatSessionForMatch(matchId);
  if (!session) return;

  clearSocialTttTurnTimer(session.id);

  const settings = parseSocialTttSettings(session.settings);
  const match = await prisma.ticTacToeMatch.findUnique({ where: { id: matchId } });
  if (!match) return;

  if (result.isDraw && !settings.endOnDraw) {
    const nextStarter: "X" | "O" = match.currentTurn === "X" ? "O" : "X";
    await startNextSocialTttRound(io, {
      matchId,
      eventSlug,
      sessionId: session.id,
      startingTurn: nextStarter,
    });
    return;
  }

  let scoreX = session.scoreX;
  let scoreO = session.scoreO;
  if (result.winnerMark === "X") scoreX += 1;
  if (result.winnerMark === "O") scoreO += 1;

  const seriesWon =
    settings.seriesMode === "race" &&
    ((result.winnerMark === "X" && scoreX >= settings.raceTarget) ||
      (result.winnerMark === "O" && scoreO >= settings.raceTarget));

  const endSeries =
    settings.seriesMode === "single" || result.isDraw || seriesWon || !result.winnerMark;

  if (!endSeries && result.winnerMark) {
    await prisma.chatGameSession.update({
      where: { id: session.id },
      data: { scoreX, scoreO, turnDeadlineAt: null },
    });

    const nextStarter: "X" | "O" = result.winnerMark === "X" ? "O" : "X";
    await startNextSocialTttRound(io, {
      matchId,
      eventSlug,
      sessionId: session.id,
      startingTurn: nextStarter,
    });
    return;
  }

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { scoreX, scoreO, turnDeadlineAt: null },
  });

  await prisma.ticTacToeMatch.update({
    where: { id: matchId },
    data: { state: "FINISHED", finishedAt: new Date() },
  });

  const { completeSocialChatGameFromMatch } = await import("@/server/games/chatGameEngine");
  await completeSocialChatGameFromMatch(matchId, eventSlug);
}

export async function updateSocialTttSettings(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
  settings: Partial<SocialTttSettings>;
}) {
  const session = await prisma.chatGameSession.findUnique({
    where: { id: params.sessionId },
    include: { participants: true },
  });
  if (!session || session.eventId !== params.eventId || session.kind !== "tic_tac_toe") {
    throw new Error("Game not found.");
  }
  if (session.hostUserId !== params.userId) {
    throw new Error("Only the host can change game settings.");
  }
  if (session.status !== "LOBBY" && session.status !== "LIVE") {
    throw new Error("Settings can only be changed before the series ends.");
  }

  const current = parseSocialTttSettings(session.settings);
  const settings = normalizeSocialTttSettingsInput(
    session.status === "LIVE"
      ? {
          ...current,
          turnTimerEnabled:
            params.settings.turnTimerEnabled ?? current.turnTimerEnabled,
          turnTimerSeconds:
            params.settings.turnTimerSeconds ?? current.turnTimerSeconds,
          endOnDraw: params.settings.endOnDraw ?? current.endOnDraw,
        }
      : {
          ...current,
          ...params.settings,
        },
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { settings: settings as object },
  });

  const io = (await import("@/server/socket/io")).tryGetIO();
  if (io) {
    if (session.status === "LIVE" && session.tttMatchId) {
      const match = await prisma.ticTacToeMatch.findUnique({
        where: { id: session.tttMatchId },
        select: { state: true },
      });
      if (match?.state === "ACTIVE") {
        if (settings.turnTimerEnabled) {
          await scheduleSocialTttTurnTimer(io, {
            sessionId: session.id,
            matchId: session.tttMatchId,
            eventSlug: params.eventSlug,
            settings,
          });
        } else {
          clearSocialTttTurnTimer(session.id);
          await prisma.chatGameSession.update({
            where: { id: session.id },
            data: { turnDeadlineAt: null },
          });
          const { broadcastTttState } = await import("@/server/games/ticTacToeEngine");
          await broadcastTttState(io, session.tttMatchId, params.eventSlug);
        }
      }
    }

    const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
    await broadcastChatGameSession(io, params.eventSlug, session.id);
  }

  const { buildChatGameSessionSnapshot } = await import("@/server/games/chatGameEngine");
  return buildChatGameSessionSnapshot(session.id);
}

export async function onSocialTttMatchStarted(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
) {
  const session = await loadChatSessionForMatch(matchId);
  if (!session) return;

  const settings = parseSocialTttSettings(session.settings);
  await scheduleSocialTttTurnTimer(io, {
    sessionId: session.id,
    matchId,
    eventSlug,
    settings,
  });
}

export async function onSocialTttMoveApplied(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
) {
  const session = await loadChatSessionForMatch(matchId);
  if (!session) return;

  const match = await prisma.ticTacToeMatch.findUnique({ where: { id: matchId } });
  if (!match || match.state !== "ACTIVE") {
    clearSocialTttTurnTimer(session.id);
    return;
  }

  const settings = parseSocialTttSettings(session.settings);
  await scheduleSocialTttTurnTimer(io, {
    sessionId: session.id,
    matchId,
    eventSlug,
    settings,
  });
}

export async function copySocialTttSessionMeta(fromSessionId: string, toSessionId: string) {
  const from = await prisma.chatGameSession.findUnique({ where: { id: fromSessionId } });
  if (!from || from.kind !== "tic_tac_toe") return;

  await prisma.chatGameSession.update({
    where: { id: toSessionId },
    data: {
      settings: (from.settings ?? DEFAULT_SOCIAL_TTT_SETTINGS) as object,
      scoreX: 0,
      scoreO: 0,
      turnDeadlineAt: null,
    },
  });
}

export async function recoverSocialTttTurnTimers(io: SocketIOServer) {
  const sessions = await prisma.chatGameSession.findMany({
    where: {
      kind: "tic_tac_toe",
      status: "LIVE",
      turnDeadlineAt: { not: null },
      tttMatchId: { not: null },
    },
    include: { event: { select: { slug: true } } },
  });

  for (const session of sessions) {
    if (!session.tttMatchId || !session.turnDeadlineAt) continue;
    const settings = parseSocialTttSettings(session.settings);
    if (!settings.turnTimerEnabled) continue;

    const remaining = session.turnDeadlineAt.getTime() - Date.now();
    if (remaining <= 0) {
      await expireSocialTttTurn(io, session.id, session.tttMatchId, session.event.slug);
      continue;
    }

    clearSocialTttTurnTimer(session.id);
    const timer = setTimeout(() => {
      void expireSocialTttTurn(io, session.id, session.tttMatchId!, session.event.slug);
    }, remaining);
    turnTimers.set(session.id, timer);
  }
}
