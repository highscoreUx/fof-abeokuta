import type { Server as SocketIOServer } from "socket.io";
import {
  DEFAULT_SOCIAL_LUDO_SETTINGS,
  parseSocialLudoSettings,
  type SocialLudoSettings,
} from "@/lib/chat-game-ludo-settings";
import type { SocialLudoSessionState } from "@/lib/chat-game-ludo-types";
import { prepareLudoStateForPlay } from "@/lib/social-games/ludo-helpers";
import { nextLudoPlayer, passLudoTurn } from "@/server/games/social/games/ludo";
import { prisma } from "@/lib/prisma";

const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function buildSocialLudoSessionState(session: {
  kind: string;
  settings: unknown;
  turnDeadlineAt: Date | null;
  socialMatch?: {
    status: string;
    currentTurnUserId: string | null;
  } | null;
}): SocialLudoSessionState | null {
  if (session.kind !== "ludo") return null;

  const settings = parseSocialLudoSettings(session.settings);
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

export function clearSocialLudoTurnTimer(sessionId: string) {
  const timer = turnTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(sessionId);
  }
}

export async function scheduleSocialLudoTurnTimer(
  io: SocketIOServer,
  params: {
    sessionId: string;
    matchId: string;
    eventSlug: string;
    settings: SocialLudoSettings;
  },
) {
  clearSocialLudoTurnTimer(params.sessionId);

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
    void expireSocialLudoTurn(io, params.sessionId, params.matchId, params.eventSlug);
  }, params.settings.turnTimerSeconds * 1000);
  turnTimers.set(params.sessionId, timer);

  const { broadcastSocialGameState } = await import("@/server/games/socialGameEngine");
  await broadcastSocialGameState(io, params.matchId, params.eventSlug);
  const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
  await broadcastChatGameSession(io, params.eventSlug, params.sessionId);
}

async function expireSocialLudoTurn(
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
  if (!match || match.status !== "ACTIVE" || match.kind !== "ludo" || !match.chatSession) {
    return;
  }

  const settings = parseSocialLudoSettings(match.chatSession.settings);
  if (!settings.turnTimerEnabled || !match.currentTurnUserId) return;

  const playerIds = match.chatSession.participants.map((p) => p.userId);
  const state = prepareLudoStateForPlay(match.state, playerIds);
  const currentUserId = match.currentTurnUserId;
  const cleared = passLudoTurn(state, currentUserId);
  const nextTurnUserId = nextLudoPlayer(cleared, currentUserId);

  await prisma.socialGameMatch.update({
    where: { id: matchId },
    data: {
      state: cleared as object,
      currentTurnUserId: nextTurnUserId,
    },
  });

  const { broadcastSocialGameState } = await import("@/server/games/socialGameEngine");
  await broadcastSocialGameState(io, matchId, eventSlug);
  const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
  await broadcastChatGameSession(io, eventSlug, sessionId);

  await scheduleSocialLudoTurnTimer(io, {
    sessionId,
    matchId,
    eventSlug,
    settings,
  });
}

export async function updateSocialLudoSettings(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
  settings: Partial<SocialLudoSettings>;
}) {
  const session = await prisma.chatGameSession.findUnique({
    where: { id: params.sessionId },
    include: { socialMatch: true },
  });
  if (!session || session.eventId !== params.eventId || session.kind !== "ludo") {
    throw new Error("Game not found.");
  }
  if (session.hostUserId !== params.userId) {
    throw new Error("Only the host can change game settings.");
  }
  if (session.status !== "LOBBY" && session.status !== "LIVE") {
    throw new Error("Settings can only be changed before the game ends.");
  }

  const current = parseSocialLudoSettings(session.settings);
  const settings = parseSocialLudoSettings({ ...current, ...params.settings });

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
        await scheduleSocialLudoTurnTimer(io, {
          sessionId: session.id,
          matchId: session.socialMatch.id,
          eventSlug: params.eventSlug,
          settings,
        });
      } else {
        clearSocialLudoTurnTimer(session.id);
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

export async function syncSocialLudoTurnTimerAfterMove(params: {
  sessionId: string;
  matchId: string;
  eventSlug: string;
  previousTurnUserId: string | null;
  nextTurnUserId: string | null;
  finished: boolean;
}) {
  if (params.finished || !params.nextTurnUserId) {
    clearSocialLudoTurnTimer(params.sessionId);
    await prisma.chatGameSession.update({
      where: { id: params.sessionId },
      data: { turnDeadlineAt: null },
    });
    return;
  }

  if (params.previousTurnUserId === params.nextTurnUserId) {
    return;
  }

  const session = await prisma.chatGameSession.findUnique({ where: { id: params.sessionId } });
  if (!session || session.kind !== "ludo") return;

  const settings = parseSocialLudoSettings(session.settings);
  const { tryGetIO } = await import("@/server/socket/io");
  const io = tryGetIO();
  if (!io) return;

  await scheduleSocialLudoTurnTimer(io, {
    sessionId: params.sessionId,
    matchId: params.matchId,
    eventSlug: params.eventSlug,
    settings,
  });
}

export { DEFAULT_SOCIAL_LUDO_SETTINGS };
