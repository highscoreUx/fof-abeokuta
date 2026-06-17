import type { Server as SocketIOServer } from "socket.io";
import { isSocialJsonGameKind } from "@/lib/social-games/kinds";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import { prisma } from "@/lib/prisma";
import { eventRoom, socialGameMatchRoom, userRoom } from "@/server/socket/rooms";
import { getSocialGameHandler } from "@/server/games/social/registry";

function playerInfo(user: {
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

export async function createSocialGameMatch(params: {
  eventId: string;
  kind: string;
  playerIds: string[];
  settings?: Record<string, unknown>;
}) {
  const handler = getSocialGameHandler(params.kind);
  if (!handler) throw new Error("Unsupported game type.");

  const state = handler.createInitialState({
    playerIds: params.playerIds,
    settings: params.settings ?? {},
  });
  const firstTurn = handler.getFirstTurnUserId(state, params.playerIds);

  return prisma.socialGameMatch.create({
    data: {
      eventId: params.eventId,
      kind: params.kind,
      status: "ACTIVE",
      state: state as object,
      currentTurnUserId: firstTurn,
    },
  });
}

export async function buildSocialGameSnapshot(
  matchId: string,
  viewerUserId?: string | null,
): Promise<SocialGameMatchSnapshot | null> {
  const match = await prisma.socialGameMatch.findUnique({
    where: { id: matchId },
    include: {
      chatSession: {
        include: {
          participants: {
            where: { role: "player" },
            include: { user: { include: { account: true } } },
          },
        },
      },
    },
  });
  if (!match || !match.chatSession) return null;

  const players = match.chatSession.participants.map((p) => ({
    ...playerInfo(p.user),
    seat: p.playerSlot ?? "0",
  }));

  return {
    matchId: match.id,
    sessionId: match.chatSession.id,
    kind: match.kind,
    status: match.status as SocialGameMatchSnapshot["status"],
    state: match.state,
    players,
    currentTurnUserId: match.currentTurnUserId,
    winnerUserId: match.winnerUserId,
    myUserId: viewerUserId ?? null,
    serverNow: Date.now(),
  };
}

export async function broadcastSocialGameState(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
) {
  const snapshot = await buildSocialGameSnapshot(matchId);
  if (!snapshot) return null;

  const rooms = new Set<string>([
    socialGameMatchRoom(matchId),
    eventRoom(eventSlug),
  ]);

  const match = await prisma.socialGameMatch.findUnique({
    where: { id: matchId },
    include: { chatSession: { include: { participants: true } } },
  });
  if (match?.chatSession) {
    for (const p of match.chatSession.participants) {
      rooms.add(userRoom(p.userId));
    }
  }

  for (const room of rooms) {
    io.to(room).emit("social-game:state", snapshot);
  }

  if (match?.chatSession) {
    for (const participant of match.chatSession.participants) {
      const personal = await buildSocialGameSnapshot(matchId, participant.userId);
      if (personal) {
        io.to(userRoom(participant.userId)).emit("social-game:state", personal);
      }
    }
  }

  return snapshot;
}

export async function applySocialGameMove(params: {
  matchId: string;
  eventSlug: string;
  userId: string;
  action: string;
  payload: Record<string, unknown>;
}) {
  const match = await prisma.socialGameMatch.findUnique({
    where: { id: params.matchId },
    include: {
      chatSession: {
        include: {
          participants: { where: { role: "player" } },
        },
      },
    },
  });
  if (!match || match.status !== "ACTIVE" || !match.chatSession) {
    throw new Error("Game not active.");
  }
  if (!isSocialJsonGameKind(match.kind)) {
    throw new Error("Unsupported game.");
  }

  const handler = getSocialGameHandler(match.kind);
  if (!handler) throw new Error("Unsupported game.");

  const playerIds = match.chatSession.participants.map((p) => p.userId);
  if (!playerIds.includes(params.userId)) {
    throw new Error("You are not a player in this game.");
  }

  if (match.kind !== "sudoku" && match.currentTurnUserId !== params.userId) {
    throw new Error("Not your turn.");
  }

  const seatByUserId: Record<string, string> = {};
  for (const p of match.chatSession.participants) {
    seatByUserId[p.userId] = p.playerSlot ?? "0";
  }

  const result = handler.applyMove(match.state, {
    userId: params.userId,
    action: params.action,
    payload: params.payload,
    playerIds,
    seatByUserId,
  });

  if (result.error) throw new Error(result.error);

  const finished = Boolean(result.winnerUserId || result.isDraw);

  await prisma.socialGameMatch.update({
    where: { id: match.id },
    data: {
      state: result.state as object,
      currentTurnUserId: finished ? null : result.nextTurnUserId,
      status: finished ? "FINISHED" : "ACTIVE",
      winnerUserId: result.isDraw ? null : result.winnerUserId,
      finishedAt: finished ? new Date() : null,
    },
  });

  const { tryGetIO } = await import("@/server/socket/io");
  const io = tryGetIO();
  if (io) {
    await broadcastSocialGameState(io, match.id, params.eventSlug);
    const chatSession = await prisma.chatGameSession.findFirst({
      where: { socialMatchId: match.id },
      select: { id: true },
    });
    if (chatSession) {
      const { broadcastChatGameSession } = await import("@/server/games/chatGameEngine");
      await broadcastChatGameSession(io, params.eventSlug, chatSession.id);
    }
    if (finished) {
      const { completeSocialJsonGame } = await import("@/server/games/chatGameEngine");
      await completeSocialJsonGame(match.id, params.eventSlug);
    }
  }

  return buildSocialGameSnapshot(match.id, params.userId);
}

export async function startSocialJsonGameMatch(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
}) {
  const session = await prisma.chatGameSession.findUnique({
    where: { id: params.sessionId },
    include: {
      participants: { where: { role: "player" } },
    },
  });
  if (!session || !isSocialJsonGameKind(session.kind)) {
    throw new Error("Game not found.");
  }

  const playerIds = session.participants.map((p) => p.userId);
  const match = await createSocialGameMatch({
    eventId: params.eventId,
    kind: session.kind,
    playerIds,
    settings: (session.settings as Record<string, unknown>) ?? {},
  });

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { socialMatchId: match.id, status: "LIVE" },
  });

  const { tryGetIO } = await import("@/server/socket/io");
  const io = tryGetIO();
  if (io) {
    const { updateSessionMessage, broadcastChatGameSession } = await import(
      "@/server/games/chatGameEngine"
    );
    const { loadChatGameSessionForSnapshot } = await import("@/server/games/chatGameEngine");
    const refreshed = await loadChatGameSessionForSnapshot(session.id);
    if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);
    await broadcastChatGameSession(io, params.eventSlug, session.id);
    await broadcastSocialGameState(io, match.id, params.eventSlug);
  }

  return match.id;
}
