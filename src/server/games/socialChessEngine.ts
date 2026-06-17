import { parseSocialChessSettings, type SocialChessSettings } from "@/lib/chat-game-chess-settings";
import type { SocialChessSessionState } from "@/lib/chat-game-chess-types";
import { prisma } from "@/lib/prisma";

export function buildSocialChessSessionState(session: {
  kind: string;
  settings: unknown;
  turnDeadlineAt: Date | null;
  socialMatch?: {
    status: string;
    currentTurnUserId: string | null;
  } | null;
}): SocialChessSessionState | null {
  if (session.kind !== "chess") return null;

  const settings = parseSocialChessSettings(session.settings);
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

export async function updateSocialChessSettings(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
  settings: Partial<SocialChessSettings>;
}) {
  const session = await prisma.chatGameSession.findUnique({
    where: { id: params.sessionId },
    include: { participants: true },
  });
  if (!session || session.eventId !== params.eventId || session.kind !== "chess") {
    throw new Error("Game not found.");
  }
  if (session.hostUserId !== params.userId) {
    throw new Error("Only the host can change game settings.");
  }
  if (session.status !== "LOBBY" && session.status !== "LIVE") {
    throw new Error("Settings can only be changed before the game ends.");
  }

  const current = parseSocialChessSettings(session.settings);
  const settings = parseSocialChessSettings({ ...current, ...params.settings });

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { settings: settings as object },
  });

  const { broadcastChatGameSession, buildChatGameSessionSnapshot } = await import(
    "@/server/games/chatGameEngine"
  );
  const { tryGetIO } = await import("@/server/socket/io");
  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  const snapshot = await buildChatGameSessionSnapshot(session.id);
  if (!snapshot) throw new Error("Could not load game.");
  return snapshot;
}
