import { parseChatContent } from "@/lib/chat-content";
import type { ChatMessage } from "@/types/chat";

export interface ChatReplyRef {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  preview: string;
}

const PREVIEW_MAX = 120;

export function messagePreview(body: string): string {
  const content = parseChatContent(body);
  if (content.type === "text") {
    return content.text.trim().slice(0, PREVIEW_MAX) || "Message";
  }
  if (content.type === "gif") return "GIF";
  if (content.type === "sticker") return content.label ?? "Sticker";
  if (content.type === "poll") return `Poll: ${content.poll.question}`.slice(0, PREVIEW_MAX);
  if (content.type === "chat_game") {
    const game = content.chatGame;
    if (game.status === "live") return `🎮 ${game.title} is live`;
    if (game.status === "lobby") return `🎮 ${game.title} — ${game.text}`.slice(0, PREVIEW_MAX);
    return `🎮 ${game.title}`;
  }
  return "Message";
}

export function buildReplyRef(message: ChatMessage): ChatReplyRef {
  return {
    id: message.id,
    username: message.user.username,
    firstName: message.user.firstName,
    lastName: message.user.lastName,
    preview: messagePreview(message.body),
  };
}

export function isValidReplyRef(value: unknown): value is ChatReplyRef {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.username === "string" &&
    typeof record.firstName === "string" &&
    typeof record.lastName === "string" &&
    typeof record.preview === "string"
  );
}
