import type { ChatParticipant } from "@/types/chat";

export interface ChatMention {
  userId: string;
  username: string;
  offset: number;
  length: number;
}

const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;

export function escapeMentionUsername(username: string): string {
  return username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isValidChatMention(value: unknown): value is ChatMention {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.userId === "string" &&
    typeof record.username === "string" &&
    typeof record.offset === "number" &&
    Number.isInteger(record.offset) &&
    record.offset >= 0 &&
    typeof record.length === "number" &&
    Number.isInteger(record.length) &&
    record.length > 0
  );
}

export function parseChatMentions(value: unknown): ChatMention[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const mentions = value.filter(isValidChatMention);
  return mentions.length > 0 ? mentions : undefined;
}

export function filterMentionCandidates(
  participants: ChatParticipant[],
  query: string,
  excludeUserId?: string,
): ChatParticipant[] {
  const normalized = query.trim().toLowerCase();
  const pool = excludeUserId
    ? participants.filter((participant) => participant.id !== excludeUserId)
    : participants;

  if (!normalized) return pool.slice(0, 8);

  return pool
    .filter((participant) => {
      const fullName = `${participant.firstName} ${participant.lastName}`.toLowerCase();
      return (
        participant.username.toLowerCase().includes(normalized) ||
        fullName.includes(normalized)
      );
    })
    .slice(0, 8);
}

export function detectActiveMentionQuery(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) return null;

  const query = before.slice(atIndex + 1);
  if (/\s/.test(query)) return null;

  const charBefore = atIndex > 0 ? before[atIndex - 1] : " ";
  if (!/\s|[([{,:;]/.test(charBefore)) return null;

  return { start: atIndex, query };
}

export function extractMentionsFromText(
  text: string,
  participants: ChatParticipant[],
): ChatMention[] {
  const byUsername = new Map(
    participants.map((participant) => [participant.username.toLowerCase(), participant]),
  );
  const mentions: ChatMention[] = [];

  for (const match of text.matchAll(MENTION_PATTERN)) {
    const username = match[1];
    const participant = byUsername.get(username.toLowerCase());
    if (!participant || match.index == null) continue;

    mentions.push({
      userId: participant.id,
      username: participant.username,
      offset: match.index,
      length: match[0].length,
    });
  }

  return mentions;
}

export function insertMentionIntoText(
  text: string,
  start: number,
  end: number,
  username: string,
): { text: string; cursor: number } {
  const mention = `@${username} `;
  const nextText = `${text.slice(0, start)}${mention}${text.slice(end)}`;
  return { text: nextText, cursor: start + mention.length };
}

export function messageMentionsUsername(
  text: string,
  mentions: ChatMention[] | undefined,
  username: string,
): boolean {
  const normalized = username.toLowerCase();
  if (mentions?.some((mention) => mention.username.toLowerCase() === normalized)) {
    return true;
  }

  const pattern = new RegExp(`@${escapeMentionUsername(username)}(?![a-zA-Z0-9_])`, "i");
  return pattern.test(text);
}

export function findMessagesMentioningUser<T extends { id: string; body: string }>(
  messages: T[],
  username: string,
  parseBody: (body: string) => { type: string; text?: string; mentions?: ChatMention[] },
): string[] {
  return messages
    .filter((message) => {
      const content = parseBody(message.body);
      if (content.type !== "text" || typeof content.text !== "string") return false;
      return messageMentionsUsername(content.text, content.mentions, username);
    })
    .map((message) => message.id);
}
