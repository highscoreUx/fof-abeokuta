import { parseChatContent } from "@/lib/chat-content";
import type { ChatGameMessageBody } from "@/lib/chat-game-types";
import { messagePreview } from "@/lib/chat-reply";
import { isSystemChatMessage } from "@/lib/chat-system";
import type { ChatMessage } from "@/types/chat";

export function lastRoomMessage(messages: ChatMessage[]): ChatMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!isSystemChatMessage(messages[i])) return messages[i];
  }
  return null;
}

export function roomPreviewText(
  message: ChatMessage | null,
  viewerUserId?: string,
): string {
  if (!message) return "No messages yet";
  const preview = messagePreview(message.body);
  if (message.userId === viewerUserId) return `You: ${preview}`;
  return `${message.user.firstName}: ${preview}`;
}

export function countUnseenMessages(
  messages: ChatMessage[],
  userId: string,
  lastReadAt?: string,
): number {
  const cutoff = lastReadAt ? new Date(lastReadAt).getTime() : 0;
  return messages.filter((message) => {
    if (isSystemChatMessage(message)) return false;
    if (message.userId === userId) return false;
    return new Date(message.createdAt).getTime() > cutoff;
  }).length;
}

export function formatRoomMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });
}

export interface RoomGameHint {
  title: string;
  status: "lobby" | "live";
  ready: boolean;
  actionable: boolean;
}

export function gameHintFromBody(
  game: ChatGameMessageBody,
  userId: string,
): RoomGameHint | null {
  if (game.status !== "lobby" && game.status !== "live") return null;

  const isPlayer = game.players.some((player) => player.userId === userId);
  const isHost = game.hostUserId === userId;
  const isFull = game.players.length >= game.maxPlayers;
  const ready =
    game.status === "lobby" &&
    (isFull || (game.gameKind === "spinner" && isHost && game.players.length >= 2));

  const actionable =
    (game.status === "live" && isPlayer) ||
    (game.status === "lobby" && isPlayer && ready) ||
    (game.status === "lobby" && isHost && game.gameKind === "spinner" && game.players.length >= 2) ||
    (game.status === "lobby" && !isPlayer && !isFull && game.joinPolicy === "open");

  return {
    title: game.title,
    status: game.status,
    ready,
    actionable,
  };
}

export function findLatestGameHint(
  messages: ChatMessage[],
  userId: string,
): RoomGameHint | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = parseChatContent(messages[i].body);
    if (content.type !== "chat_game") continue;
    const hint = gameHintFromBody(content.chatGame, userId);
    if (hint) return hint;
  }
  return null;
}
