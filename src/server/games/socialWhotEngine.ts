import type { Server as SocketIOServer } from "socket.io";
import {
  DEFAULT_SOCIAL_WHOT_SETTINGS,
  parseSocialWhotSettings,
  type SocialWhotSettings,
} from "@/lib/chat-game-whot-settings";
import type { SocialWhotSessionState } from "@/lib/chat-game-whot-types";
import type { WhotState } from "@/lib/social-games/game-state-types";
import { prepareWhotStateForPlay } from "@/lib/social-games/whot-helpers";
import { applyWhotDraw, nextWhotPlayer } from "@/server/games/social/games/whot";
import { prisma } from "@/lib/prisma";

const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function buildSocialWhotSessionState(session: {
  kind: string;
  settings: unknown;
  turnDeadlineAt: Date | null;
  socialMatch?: {
    status: string;
    currentTurnUserId: string | null;
  } | null;
}): SocialWhotSessionState | null {
  if (session.kind !== "whot") return null;

  const settings = parseSocialWhotSettings(session.settings);
  let turnUserId: string | null = null;
  if (session.socialMatch?.status === "ACTIVE") {
    turnUserId = session.socialMatch.currentTurnUserId;
  }

  return {
    settings,
    turnDeadlineAt: session.turnDeadlineAt?.getTime() ?? null,
    turnUserId,
  };
}

export function clearSocialWhotTurnTimer(sessionId: string) {
  const timer = turnTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(sessionId);
  }
}

export async function scheduleSocialWhotTurnTimer(
  io: SocketIOServer,
  params: {
    sessionId: string;
    matchId: string;
    eventSlug: string;
    settings: SocialWhotSettings;
  },
) {
  clearSocialWhotTurnTimer(params.sessionId);

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

  const timer = setTimeout(() => {
    void expireSocialWhotTurn(io, params.sessionId, params.matchId, params.eventSlug);
  }, params.settings.turnTimerSeconds * 1000);
  turnTimers.set(params.sessionId, timer);

  const { broadcastSocialGameState } = await import("@/server/games/socialGameEngine");
  await broadcastSocialGameState(io, params.matchId, params.eventSlug);
  const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
  await broadcastChatGameSession(io, params.eventSlug, params.sessionId);
}

async function expireSocialWhotTurn(
  io: SocketIOServer,
  sessionId: string,
  matchId: string,
  eventSlug: string,
) {
  turnTimers.delete(sessionId);

  const match = await prisma.socialGameMatch.findUnique({
    where: { id: matchId },
    include: {
      chatSession: {
        include: { participants: { where: { role: "player" } } },
      },
    },
  });
  if (!match || match.status !== "ACTIVE" || match.kind !== "whot" || !match.chatSession) {
    return;
  }

  const settings = parseSocialWhotSettings(match.chatSession.settings);
  if (!settings.turnTimerEnabled || !match.currentTurnUserId) return;

  const currentUserId = match.currentTurnUserId;
  const playerIds = match.chatSession.participants.map((p) => p.userId);
  const whotState = prepareWhotStateForPlay(match.state, playerIds);
  const draw = applyWhotDraw(whotState, currentUserId, settings);
  if (draw.error) return;

  const finished = Boolean(draw.winnerUserId);

  await prisma.socialGameMatch.update({
    where: { id: matchId },
    data: {
      state: draw.state as object,
      currentTurnUserId: finished ? null : nextWhotPlayer(draw.state, currentUserId),
      status: finished ? "FINISHED" : "ACTIVE",
      winnerUserId: draw.winnerUserId,
      finishedAt: finished ? new Date() : null,
    },
  });

  const { broadcastSocialGameState } = await import("@/server/games/socialGameEngine");
  await broadcastSocialGameState(io, matchId, eventSlug);
  const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
  await broadcastChatGameSession(io, eventSlug, sessionId);

  if (finished) {
    const { completeSocialJsonGame } = await import("@/server/games/chatGameEngine");
    await completeSocialJsonGame(matchId, eventSlug);
    clearSocialWhotTurnTimer(sessionId);
    return;
  }

  await scheduleSocialWhotTurnTimer(io, {
    sessionId,
    matchId,
    eventSlug,
    settings,
  });
}

export async function updateSocialWhotSettings(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
  settings: Partial<SocialWhotSettings>;
}) {
  const session = await prisma.chatGameSession.findUnique({
    where: { id: params.sessionId },
    include: { socialMatch: true },
  });
  if (!session || session.eventId !== params.eventId || session.kind !== "whot") {
    throw new Error("Game not found.");
  }
  if (session.hostUserId !== params.userId) {
    throw new Error("Only the host can change game settings.");
  }
  if (session.status !== "LOBBY" && session.status !== "LIVE") {
    throw new Error("Settings can only be changed before the game ends.");
  }

  const current = parseSocialWhotSettings(session.settings);
  const settings = parseSocialWhotSettings({ ...current, ...params.settings });

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { settings: settings as object },
  });

  const { tryGetIO } = await import("@/server/socket/io");
  const io = tryGetIO();
  if (io) {
    const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
    await broadcastChatGameSession(io, params.eventSlug, session.id);
    if (session.socialMatch?.status === "ACTIVE" && session.socialMatch.id) {
      if (settings.turnTimerEnabled) {
        await scheduleSocialWhotTurnTimer(io, {
          sessionId: session.id,
          matchId: session.socialMatch.id,
          eventSlug: params.eventSlug,
          settings,
        });
      } else {
        clearSocialWhotTurnTimer(session.id);
        await prisma.chatGameSession.update({
          where: { id: session.id },
          data: { turnDeadlineAt: null },
        });
      }
    }
  }

  const { buildChatGameSessionSnapshot } = await import("@/server/games/chatGameEngine");
  const snapshot = await buildChatGameSessionSnapshot(session.id);
  if (!snapshot) throw new Error("Could not load game.");
  return snapshot;
}

export async function syncSocialWhotTurnTimerAfterMove(params: {
  sessionId: string;
  matchId: string;
  eventSlug: string;
  previousTurnUserId: string | null;
  nextTurnUserId: string | null;
  finished: boolean;
}) {
  if (params.finished || !params.nextTurnUserId) {
    clearSocialWhotTurnTimer(params.sessionId);
    await prisma.chatGameSession.update({
      where: { id: params.sessionId },
      data: { turnDeadlineAt: null },
    });
    return;
  }

  if (params.previousTurnUserId === params.nextTurnUserId) {
    const session = await prisma.chatGameSession.findUnique({ where: { id: params.sessionId } });
    if (!session || session.kind !== "whot") return;
    const settings = parseSocialWhotSettings(session.settings);
    const { tryGetIO } = await import("@/server/socket/io");
    const io = tryGetIO();
    if (!io) return;
    await scheduleSocialWhotTurnTimer(io, {
      sessionId: params.sessionId,
      matchId: params.matchId,
      eventSlug: params.eventSlug,
      settings,
    });
    return;
  }

  const session = await prisma.chatGameSession.findUnique({ where: { id: params.sessionId } });
  if (!session || session.kind !== "whot") return;

  const settings = parseSocialWhotSettings(session.settings);
  const { tryGetIO } = await import("@/server/socket/io");
  const io = tryGetIO();
  if (!io) return;

  await scheduleSocialWhotTurnTimer(io, {
    sessionId: params.sessionId,
    matchId: params.matchId,
    eventSlug: params.eventSlug,
    settings,
  });
}

export { DEFAULT_SOCIAL_WHOT_SETTINGS };
