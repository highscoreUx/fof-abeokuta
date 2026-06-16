import type { SocialTttSessionState } from "@/lib/chat-game-ttt-types";
import type { SocialHangmanSessionState } from "@/lib/chat-game-hangman-types";
import {
  chatGameTitle,
  isChatGameKind,
  type ChatGameKind,
} from "@/lib/activities/manifest";

export type { ChatGameKind };

export type ChatGameLobbyStatus = "lobby" | "live" | "ended" | "cancelled";

export type { SocialTttSessionState, SocialHangmanSessionState };

export interface ChatGamePlayerSummary {
  userId: string;
  firstName: string;
  lastName: string;
  slot?: "X" | "O";
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
}

export interface ChatGameSessionSnapshot {
  sessionId: string;
  eventId: string;
  kind: ChatGameKind;
  source: "social" | "official";
  hostUserId: string;
  hostFirstName: string;
  channel: "DM" | "TEAM";
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
