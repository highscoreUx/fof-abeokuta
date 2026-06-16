import type { Server as SocketIOServer } from "socket.io";
import {
  DEFAULT_SOCIAL_HANGMAN_SETTINGS,
  normalizeSocialHangmanSettingsInput,
  parseSocialHangmanScore,
  parseSocialHangmanSettings,
  type SocialHangmanSettings,
} from "@/lib/chat-game-hangman-settings";
import type { SocialHangmanSessionState } from "@/lib/chat-game-hangman-types";
import { pickSocialHangmanWord } from "@/data/social-hangman/word-bank";
import { isSocialHangmanTopicId } from "@/data/social-hangman/topics";
import { prisma } from "@/lib/prisma";

const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function loadChatSessionForMatch(matchId: string) {
  return prisma.chatGameSession.findFirst({
    where: { hangmanMatchId: matchId },
    include: {
      participants: { where: { role: "player" } },
    },
  });
}

export function buildSocialHangmanSessionState(session: {
  kind: string;
  settings: unknown;
  scoreX: number;
  scoreO: number;
  turnDeadlineAt: Date | null;
  hangmanMatch?: {
    state: string;
    currentTurn: string;
    playerXUserId: string | null;
    playerOUserId: string | null;
  } | null;
}): SocialHangmanSessionState | null {
  if (session.kind !== "hangman") return null;

  const settings = parseSocialHangmanSettings(session.settings);
  const score = parseSocialHangmanScore({ x: session.scoreX, o: session.scoreO });
  const turnDeadlineAt = session.turnDeadlineAt?.getTime() ?? null;

  let turnUserId: string | null = null;
  if (session.hangmanMatch?.state === "ACTIVE") {
    turnUserId =
      session.hangmanMatch.currentTurn === "X"
        ? session.hangmanMatch.playerXUserId
        : session.hangmanMatch.playerOUserId;
  }

  return { settings, score, turnDeadlineAt, turnUserId };
}

export function clearSocialHangmanTurnTimer(sessionId: string) {
  const timer = turnTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(sessionId);
  }
}

export async function scheduleSocialHangmanTurnTimer(
  io: SocketIOServer,
  params: {
    sessionId: string;
    matchId: string;
    eventSlug: string;
    settings: SocialHangmanSettings;
  },
) {
  clearSocialHangmanTurnTimer(params.sessionId);

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
    void expireSocialHangmanTurn(io, params.sessionId, params.matchId, params.eventSlug);
  }, delayMs);
  turnTimers.set(params.sessionId, timer);

  const { broadcastHangmanState } = await import("@/server/games/hangmanEngine");
  await broadcastHangmanState(io, params.matchId, params.eventSlug);
  const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
  await broadcastChatGameSession(io, params.eventSlug, params.sessionId);
}

async function passSocialHangmanTurn(
  io: SocketIOServer,
  sessionId: string,
  matchId: string,
  eventSlug: string,
) {
  const session = await prisma.chatGameSession.findUnique({ where: { id: sessionId } });
  const match = await prisma.hangmanMatch.findUnique({ where: { id: matchId } });
  if (!session || !match || match.state !== "ACTIVE") return;

  await prisma.hangmanMatch.update({
    where: { id: matchId },
    data: {
      currentTurn: match.currentTurn === "X" ? "O" : "X",
      turnNumber: match.turnNumber + 1,
      councilVotes: {},
    },
  });

  const settings = parseSocialHangmanSettings(session.settings);
  await scheduleSocialHangmanTurnTimer(io, {
    sessionId,
    matchId,
    eventSlug,
    settings,
  });

  const { broadcastHangmanState } = await import("@/server/games/hangmanEngine");
  await broadcastHangmanState(io, matchId, eventSlug);
}

async function expireSocialHangmanTurn(
  io: SocketIOServer,
  sessionId: string,
  matchId: string,
  eventSlug: string,
) {
  clearSocialHangmanTurnTimer(sessionId);
  await prisma.chatGameSession.update({
    where: { id: sessionId },
    data: { turnDeadlineAt: null },
  });
  await passSocialHangmanTurn(io, sessionId, matchId, eventSlug);
}

async function startNextSocialHangmanRound(
  io: SocketIOServer,
  params: {
    matchId: string;
    eventSlug: string;
    sessionId: string;
    startingTurn: "X" | "O";
  },
) {
  const session = await prisma.chatGameSession.findUnique({ where: { id: params.sessionId } });
  if (!session) return;

  const settings = parseSocialHangmanSettings(session.settings);
  const secretWord = pickSocialHangmanWord(settings);

  await prisma.hangmanMatch.update({
    where: { id: params.matchId },
    data: {
      state: "ACTIVE",
      secretWord,
      guessedLetters: [],
      councilVotes: {},
      wrongGuessesX: 0,
      wrongGuessesO: 0,
      currentTurn: params.startingTurn,
      turnNumber: 0,
      winnerTeamId: null,
      winnerUserId: null,
      finishedAt: null,
    },
  });

  await scheduleSocialHangmanTurnTimer(io, {
    sessionId: params.sessionId,
    matchId: params.matchId,
    eventSlug: params.eventSlug,
    settings,
  });

  const { updateSessionMessage, broadcastChatGameSession, loadChatGameSessionForSnapshot } =
    await import("@/server/games/chatGameEngine");
  const refreshed = await loadChatGameSessionForSnapshot(params.sessionId);
  if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);
  await broadcastChatGameSession(io, params.eventSlug, params.sessionId);

  const { broadcastHangmanState } = await import("@/server/games/hangmanEngine");
  await broadcastHangmanState(io, params.matchId, params.eventSlug);
}

export async function handleSocialHangmanRoundEnd(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
  result: { winnerMark: "X" | "O" },
) {
  const session = await loadChatSessionForMatch(matchId);
  if (!session) {
    const { completeSocialChatGameFromMatch } = await import("@/server/games/chatGameEngine");
    await completeSocialChatGameFromMatch(matchId, eventSlug);
    return;
  }

  clearSocialHangmanTurnTimer(session.id);

  const settings = parseSocialHangmanSettings(session.settings);
  let scoreX = session.scoreX;
  let scoreO = session.scoreO;
  if (result.winnerMark === "X") scoreX += 1;
  if (result.winnerMark === "O") scoreO += 1;

  const seriesWon =
    settings.seriesMode === "race" &&
    ((result.winnerMark === "X" && scoreX >= settings.raceTarget) ||
      (result.winnerMark === "O" && scoreO >= settings.raceTarget));

  const endSeries = settings.seriesMode === "single" || seriesWon;

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { scoreX, scoreO, turnDeadlineAt: null },
  });

  if (!endSeries) {
    const nextStarter: "X" | "O" = result.winnerMark === "X" ? "O" : "X";
    await startNextSocialHangmanRound(io, {
      matchId,
      eventSlug,
      sessionId: session.id,
      startingTurn: nextStarter,
    });
    return;
  }

  await prisma.hangmanMatch.update({
    where: { id: matchId },
    data: { state: "FINISHED", finishedAt: new Date() },
  });

  const { completeSocialChatGameFromMatch } = await import("@/server/games/chatGameEngine");
  await completeSocialChatGameFromMatch(matchId, eventSlug);
}

export async function updateSocialHangmanSettings(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
  settings: Partial<SocialHangmanSettings>;
}) {
  const session = await prisma.chatGameSession.findUnique({
    where: { id: params.sessionId },
    include: { participants: true },
  });
  if (!session || session.eventId !== params.eventId || session.kind !== "hangman") {
    throw new Error("Game not found.");
  }
  if (session.hostUserId !== params.userId) {
    throw new Error("Only the host can change game settings.");
  }
  if (session.status !== "LOBBY" && session.status !== "LIVE") {
    throw new Error("Settings can only be changed before the series ends.");
  }

  const current = parseSocialHangmanSettings(session.settings);
  const settings = normalizeSocialHangmanSettingsInput(
    session.status === "LIVE"
      ? {
          ...current,
          turnTimerEnabled:
            params.settings.turnTimerEnabled ?? current.turnTimerEnabled,
          turnTimerSeconds:
            params.settings.turnTimerSeconds ?? current.turnTimerSeconds,
        }
      : {
          ...current,
          ...params.settings,
        },
  );

  if (settings.topicMode === "topic" && (!settings.topicId || !isSocialHangmanTopicId(settings.topicId))) {
    throw new Error("Choose a valid topic.");
  }

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { settings: settings as object },
  });

  const io = (await import("@/server/socket/io")).tryGetIO();
  if (io) {
    if (session.status === "LIVE" && session.hangmanMatchId) {
      const match = await prisma.hangmanMatch.findUnique({
        where: { id: session.hangmanMatchId },
        select: { state: true },
      });
      if (match?.state === "ACTIVE") {
        if (settings.turnTimerEnabled) {
          await scheduleSocialHangmanTurnTimer(io, {
            sessionId: session.id,
            matchId: session.hangmanMatchId,
            eventSlug: params.eventSlug,
            settings,
          });
        } else {
          clearSocialHangmanTurnTimer(session.id);
          await prisma.chatGameSession.update({
            where: { id: session.id },
            data: { turnDeadlineAt: null },
          });
          const { broadcastHangmanState } = await import("@/server/games/hangmanEngine");
          await broadcastHangmanState(io, session.hangmanMatchId, params.eventSlug);
        }
      }
    }

    const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
    await broadcastChatGameSession(io, params.eventSlug, session.id);
  }

  const { buildChatGameSessionSnapshot } = await import("@/server/games/chatGameEngine");
  return buildChatGameSessionSnapshot(session.id);
}

export async function onSocialHangmanMatchStarted(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
) {
  const session = await loadChatSessionForMatch(matchId);
  if (!session) return;

  const settings = parseSocialHangmanSettings(session.settings);
  await scheduleSocialHangmanTurnTimer(io, {
    sessionId: session.id,
    matchId,
    eventSlug,
    settings,
  });
}

export async function onSocialHangmanGuessApplied(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
) {
  const session = await loadChatSessionForMatch(matchId);
  if (!session) return;

  const match = await prisma.hangmanMatch.findUnique({ where: { id: matchId } });
  if (!match || match.state !== "ACTIVE") {
    clearSocialHangmanTurnTimer(session.id);
    return;
  }

  const settings = parseSocialHangmanSettings(session.settings);
  await scheduleSocialHangmanTurnTimer(io, {
    sessionId: session.id,
    matchId,
    eventSlug,
    settings,
  });
}

export async function copySocialHangmanSessionMeta(fromSessionId: string, toSessionId: string) {
  const from = await prisma.chatGameSession.findUnique({ where: { id: fromSessionId } });
  if (!from || from.kind !== "hangman") return;

  await prisma.chatGameSession.update({
    where: { id: toSessionId },
    data: {
      settings: (from.settings ?? DEFAULT_SOCIAL_HANGMAN_SETTINGS) as object,
      scoreX: 0,
      scoreO: 0,
      turnDeadlineAt: null,
    },
  });
}

export async function recoverSocialHangmanTurnTimers(io: SocketIOServer) {
  const sessions = await prisma.chatGameSession.findMany({
    where: {
      kind: "hangman",
      status: "LIVE",
      turnDeadlineAt: { not: null },
      hangmanMatchId: { not: null },
    },
    include: { event: { select: { slug: true } } },
  });

  for (const session of sessions) {
    if (!session.hangmanMatchId || !session.turnDeadlineAt) continue;
    const settings = parseSocialHangmanSettings(session.settings);
    if (!settings.turnTimerEnabled) continue;

    const remaining = session.turnDeadlineAt.getTime() - Date.now();
    if (remaining <= 0) {
      await expireSocialHangmanTurn(io, session.id, session.hangmanMatchId, session.event.slug);
      continue;
    }

    clearSocialHangmanTurnTimer(session.id);
    const timer = setTimeout(() => {
      void expireSocialHangmanTurn(
        io,
        session.id,
        session.hangmanMatchId!,
        session.event.slug,
      );
    }, remaining);
    turnTimers.set(session.id, timer);
  }
}
