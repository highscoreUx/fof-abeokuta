import type { SocialTttSessionState } from "@/lib/chat-game-ttt-types";
import type { SocialHangmanSessionState } from "@/lib/chat-game-hangman-types";
import type { SocialChessSessionState } from "@/lib/chat-game-chess-types";
import type { SocialLudoSessionState } from "@/lib/chat-game-ludo-types";
import type { SocialWhotSessionState } from "@/lib/chat-game-whot-types";
import {
  chatGameTitle,
  isChatGameKind,
  type ChatGameKind,
  type ChatGameChannel,
} from "@/lib/activities/manifest";
import type { ChatGameCancellationMeta } from "@/lib/chat-game-cancellation";

export type { ChatGameCancellationMeta };

export type { ChatGameKind, ChatGameChannel };

export type ChatGameLobbyStatus = "lobby" | "live" | "ended" | "cancelled";

export function isTerminalChatGameStatus(
  status: ChatGameLobbyStatus | undefined,
): boolean {
  return status === "ended" || status === "cancelled";
}

export type {
  SocialTttSessionState,
  SocialHangmanSessionState,
  SocialChessSessionState,
  SocialLudoSessionState,
  SocialWhotSessionState,
};

export interface ChatGamePlayerSummary {
  userId: string;
  firstName: string;
  lastName: string;
  slot?: "X" | "O" | string;
}

export interface ChatGameMessageBody {
  type: "chat_game";
  sessionId: string;
  gameKind: ChatGameKind;
  title: string;
  status: ChatGameLobbyStatus;
  hostUserId: string;
  hostFirstName: string;
  joinPolicy: "invite_only" | "open";
  maxPlayers: number;
  players: ChatGamePlayerSummary[];
  spectatorCount: number;
  matchId?: string;
  text: string;
  /** Set on spectator invite DMs so the card can offer Watch before the lobby is full. */
  spectatorInvite?: boolean;
}

export interface ChatGameSessionSnapshot {
  sessionId: string;
  eventId: string;
  kind: ChatGameKind;
  source: "social" | "official";
  hostUserId: string;
  hostFirstName: string;
  channel: ChatGameChannel;
  teamId: string | null;
  dmPeerUserId: string | null;
  messageId: string | null;
  joinPolicy: "invite_only" | "open";
  maxPlayers: number;
  status: ChatGameLobbyStatus;
  matchId: string | null;
  challengeId: string | null;
  players: ChatGamePlayerSummary[];
  spectatorCount: number;
  title: string;
  text: string;
  serverNow: number;
  /** Present for live social X and O sessions. */
  socialTtt?: SocialTttSessionState;
  /** Present for live social Hangman sessions. */
  socialHangman?: SocialHangmanSessionState;
  /** Present for social Chess sessions. */
  socialChess?: SocialChessSessionState;
  /** Present for social Ludo sessions. */
  socialLudo?: SocialLudoSessionState;
  /** Present for social Whot sessions. */
  socialWhot?: SocialWhotSessionState;
  /** Set when a live game was cancelled (forfeit winner, if any). */
  cancellation?: ChatGameCancellationMeta;
}

export interface ChatGameRematchPayload {
  fromSessionId: string;
  session: ChatGameSessionSnapshot;
}

export { chatGameTitle, isChatGameKind };

export function serializeChatGameMessage(body: ChatGameMessageBody): string {
  return JSON.stringify(body);
}

export function parseChatGameMessageBody(body: string): ChatGameMessageBody | null {
  if (!body.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(body) as Partial<ChatGameMessageBody>;
    if (
      parsed.type !== "chat_game" ||
      typeof parsed.gameKind !== "string" ||
      !isChatGameKind(parsed.gameKind) ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.text !== "string" ||
      typeof parsed.hostUserId !== "string"
    ) {
      return null;
    }
    return parsed as ChatGameMessageBody;
  } catch {
    return null;
  }
}
