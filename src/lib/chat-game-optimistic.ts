import { dmRoomId } from "@/lib/chat-dm";
import { chatGameTitle, type ChatGameChannel } from "@/lib/activities/manifest";
import type { ChatGameKind, ChatGameMessageBody } from "@/lib/chat-game-types";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import type { AuthUser } from "@/types";

export type ChatGameOptimisticAction =
  | { type: "join"; asSpectator?: boolean }
  | { type: "start" }
  | { type: "cancel" }
  | { type: "invite" };

export function roomIdForChatGameChannel(
  channel: ChatGameChannel,
  options: { peerUserId?: string; teamId?: string },
): string {
  if (channel === "DM" && options.peerUserId) return dmRoomId(options.peerUserId);
  if (channel === "TEAM" && options.teamId) return options.teamId;
  if (channel === "STAFF") return STAFF_ROOM_ID;
  return "global";
}

export function createOptimisticChatGameBody(
  kind: ChatGameKind,
  user: AuthUser,
): ChatGameMessageBody {
  return {
    type: "chat_game",
    sessionId: `pending-game-${crypto.randomUUID()}`,
    gameKind: kind,
    title: chatGameTitle(kind),
    status: "lobby",
    hostUserId: user.id,
    hostFirstName: user.firstName,
    joinPolicy: "open",
    maxPlayers: 2,
    players: [
      {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        slot: "X",
      },
    ],
    spectatorCount: 0,
    text: "Starting game…",
  };
}

export function applyOptimisticChatGameAction(
  body: ChatGameMessageBody,
  action: ChatGameOptimisticAction,
  user: AuthUser,
): ChatGameMessageBody {
  switch (action.type) {
    case "join": {
      if (action.asSpectator) {
        const alreadySpectating = body.players.every((player) => player.userId !== user.id);
        if (!alreadySpectating) return body;
        return {
          ...body,
          spectatorCount: body.spectatorCount + 1,
          text: "Joining as spectator…",
        };
      }
      if (body.players.some((player) => player.userId === user.id)) return body;
      const slot = body.players.length === 0 ? "X" : body.players.length === 1 ? "O" : undefined;
      return {
        ...body,
        players: [
          ...body.players,
          {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            slot,
          },
        ],
        text:
          body.players.length + 1 >= body.maxPlayers
            ? "Ready to play!"
            : "Waiting for players…",
      };
    }
    case "start":
      return {
        ...body,
        status: "live",
        text: "Game starting…",
      };
    case "cancel":
      return {
        ...body,
        status: "cancelled",
        text: "Game cancelled",
      };
    case "invite":
      return body;
    default:
      return body;
  }
}
