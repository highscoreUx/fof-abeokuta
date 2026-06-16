import { isValidReplyRef, type ChatReplyRef } from "@/lib/chat-reply";
import {
  isValidPollData,
  parsePollBody,
  sanitizeNewPoll,
  serializePoll,
  type ChatPollData,
} from "@/lib/chat-poll";
import { parseActivityChatBody, type ActivityChatBody } from "@/lib/activity-chat-types";
import { parseChatGameMessageBody, type ChatGameMessageBody } from "@/lib/chat-game-types";

export type { ChatPollData, ChatReplyRef };
export type ChatContent =
  | { type: "text"; text: string; replyTo?: ChatReplyRef }
  | { type: "gif"; url: string; alt?: string }
  | { type: "sticker"; id: string; url: string; label?: string }
  | { type: "poll"; poll: ChatPollData }
  | { type: "activity"; activity: ActivityChatBody }
  | { type: "chat_game"; chatGame: ChatGameMessageBody };

const ALLOWED_GIF_HOSTS = ["media.giphy.com", "media.tenor.com", "i.giphy.com"];

export function isAllowedGifUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_GIF_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

export function isAllowedStickerUrl(url: string): boolean {
  return url.startsWith("/chat/stickers/") && !url.includes("..");
}

export function serializeChatContent(content: ChatContent): string {
  if (content.type === "text") {
    const text = content.text.trim();
    if (!text) return "";
    if (content.replyTo) {
      return JSON.stringify({ type: "text", text, replyTo: content.replyTo });
    }
    return text;
  }
  if (content.type === "poll") return serializePoll(content.poll);
  if (content.type === "activity") return JSON.stringify(content.activity);
  if (content.type === "chat_game") return JSON.stringify(content.chatGame);
  return JSON.stringify(content);
}

export function parseChatContent(body: string): ChatContent {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<ChatContent>;
      if (parsed.type === "gif" && typeof parsed.url === "string" && isAllowedGifUrl(parsed.url)) {
        return { type: "gif", url: parsed.url, alt: typeof parsed.alt === "string" ? parsed.alt : undefined };
      }
      if (
        parsed.type === "sticker" &&
        typeof parsed.url === "string" &&
        typeof parsed.id === "string" &&
        isAllowedStickerUrl(parsed.url)
      ) {
        return {
          type: "sticker",
          id: parsed.id,
          url: parsed.url,
          label: typeof parsed.label === "string" ? parsed.label : undefined,
        };
      }
      const poll = parsePollBody(trimmed);
      if (poll) return { type: "poll", poll };
      const activity = parseActivityChatBody(trimmed);
      if (activity) return { type: "activity", activity };
      const chatGame = parseChatGameMessageBody(trimmed);
      if (chatGame) return { type: "chat_game", chatGame };
      if (parsed.type === "text" && typeof parsed.text === "string") {
        return {
          type: "text",
          text: parsed.text,
          replyTo: isValidReplyRef(parsed.replyTo) ? parsed.replyTo : undefined,
        };
      }
    } catch {
      // plain text fallback
    }
  }
  return { type: "text", text: body };
}

export function normalizeChatPayload(input: unknown): string | null {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{")) {
      const content = parseChatContent(trimmed);
      if (content.type !== "text") return serializeChatContent(content);
    }
    return trimmed.slice(0, 2000);
  }

  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    if (record.type === "gif" && typeof record.url === "string" && isAllowedGifUrl(record.url)) {
      return JSON.stringify({
        type: "gif",
        url: record.url,
        alt: typeof record.alt === "string" ? record.alt.slice(0, 120) : "",
      });
    }
    if (
      record.type === "sticker" &&
      typeof record.url === "string" &&
      typeof record.id === "string" &&
      isAllowedStickerUrl(record.url)
    ) {
      return JSON.stringify({
        type: "sticker",
        id: record.id.slice(0, 64),
        url: record.url,
        label: typeof record.label === "string" ? record.label.slice(0, 64) : "",
      });
    }
    if (record.type === "text" && typeof record.text === "string") {
      const text = record.text.trim();
      if (!text) return null;
      const replyTo = isValidReplyRef(record.replyTo) ? record.replyTo : undefined;
      return replyTo
        ? JSON.stringify({ type: "text", text: text.slice(0, 2000), replyTo })
        : text.slice(0, 2000);
    }
    if (record.type === "poll") {
      const source = record.poll && typeof record.poll === "object" ? record.poll : record;
      const poll = sanitizeNewPoll(source);
      return poll ? serializePoll(poll) : null;
    }
    if (record.type === "activity") {
      const activity =
        record.activity && typeof record.activity === "object" ? record.activity : record;
      const parsed = parseActivityChatBody(JSON.stringify(activity));
      return parsed ? JSON.stringify(parsed) : null;
    }
    if (record.type === "chat_game") {
      const chatGame =
        record.chatGame && typeof record.chatGame === "object" ? record.chatGame : record;
      const parsed = parseChatGameMessageBody(JSON.stringify(chatGame));
      return parsed ? JSON.stringify(parsed) : null;
    }
  }

  if (typeof input === "string" && input.trim().startsWith("{")) {
    const activity = parseActivityChatBody(input);
    if (activity) return JSON.stringify(activity);
  }

  return null;
}
