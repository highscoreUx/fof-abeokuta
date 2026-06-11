export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_MAX_QUESTION = 200;
export const POLL_MAX_OPTION = 100;
export const POLL_MAX_EXPIRY_MINUTES = 24 * 60;

export interface ChatPollData {
  type: "poll";
  question: string;
  options: string[];
  /** userId → selected option index */
  voters: Record<string, number>;
  allowVoteSwitching?: boolean;
  /** ISO timestamp when the poll closes */
  expiresAt?: string;
}

export interface CreatePollSettings {
  allowVoteSwitching?: boolean;
  expiresInMinutes?: number;
}

export function createPoll(
  question: string,
  options: string[],
  settings: CreatePollSettings = {},
): ChatPollData {
  const poll: ChatPollData = {
    type: "poll",
    question: question.trim(),
    options: options.map((o) => o.trim()).filter(Boolean),
    voters: {},
    allowVoteSwitching: settings.allowVoteSwitching === true,
  };

  if (settings.expiresInMinutes && settings.expiresInMinutes > 0) {
    const minutes = Math.min(settings.expiresInMinutes, POLL_MAX_EXPIRY_MINUTES);
    poll.expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
  }

  return poll;
}

/** @deprecated Use createPoll */
export function createEmptyPoll(question: string, options: string[]) {
  return createPoll(question, options);
}

export function isValidPollData(data: ChatPollData): boolean {
  if (data.type !== "poll") return false;
  if (!data.question.trim() || data.question.length > POLL_MAX_QUESTION) return false;
  if (data.options.length < POLL_MIN_OPTIONS || data.options.length > POLL_MAX_OPTIONS) {
    return false;
  }
  if (data.options.some((o) => !o.trim() || o.length > POLL_MAX_OPTION)) return false;
  if (!data.voters || typeof data.voters !== "object") return false;
  if (data.expiresAt !== undefined && Number.isNaN(new Date(data.expiresAt).getTime())) {
    return false;
  }
  return true;
}

export function parsePollBody(body: string): ChatPollData | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(trimmed) as Partial<ChatPollData>;
    if (parsed.type !== "poll") return null;
    if (typeof parsed.question !== "string" || !Array.isArray(parsed.options)) return null;

    const voters: Record<string, number> = {};
    if (parsed.voters && typeof parsed.voters === "object") {
      for (const [userId, index] of Object.entries(parsed.voters)) {
        if (typeof index === "number" && Number.isInteger(index)) {
          voters[userId] = index;
        }
      }
    }

    const poll: ChatPollData = {
      type: "poll",
      question: parsed.question.slice(0, POLL_MAX_QUESTION),
      options: parsed.options
        .filter((o): o is string => typeof o === "string")
        .map((o) => o.slice(0, POLL_MAX_OPTION))
        .slice(0, POLL_MAX_OPTIONS),
      voters,
      allowVoteSwitching: parsed.allowVoteSwitching === true,
      ...(typeof parsed.expiresAt === "string" ? { expiresAt: parsed.expiresAt } : {}),
    };

    return isValidPollData(poll) ? poll : null;
  } catch {
    return null;
  }
}

export function serializePoll(poll: ChatPollData): string {
  return JSON.stringify(poll);
}

export function isPollExpired(poll: ChatPollData, now = Date.now()): boolean {
  if (!poll.expiresAt) return false;
  const expires = new Date(poll.expiresAt).getTime();
  return Number.isNaN(expires) || expires <= now;
}

export function formatPollTimeRemaining(poll: ChatPollData, now = Date.now()): string | null {
  if (!poll.expiresAt) return null;
  const ms = new Date(poll.expiresAt).getTime() - now;
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export function castPollVote(
  poll: ChatPollData,
  userId: string,
  optionIndex: number,
): ChatPollData {
  if (isPollExpired(poll)) {
    throw new Error("Poll has ended");
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    throw new Error("Invalid option");
  }

  const existing = poll.voters[userId];
  if (existing !== undefined) {
    if (existing === optionIndex) return poll;
    if (!poll.allowVoteSwitching) {
      throw new Error("You have already voted on this poll");
    }
  }

  return {
    ...poll,
    voters: { ...poll.voters, [userId]: optionIndex },
  };
}

export function getPollStats(poll: ChatPollData, userId?: string) {
  const counts = poll.options.map(() => 0);
  for (const index of Object.values(poll.voters)) {
    if (index >= 0 && index < counts.length) counts[index]!++;
  }

  const total = counts.reduce((sum, n) => sum + n, 0);
  const userVote = userId ? poll.voters[userId] : undefined;
  const hasVoted = userVote !== undefined;

  return {
    counts,
    total,
    userVote,
    hasVoted,
    percents: counts.map((count) => (total > 0 ? Math.round((count / total) * 100) : 0)),
  };
}

export function sanitizeNewPoll(input: unknown): ChatPollData | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  if (record.type !== "poll") return null;

  const question = typeof record.question === "string" ? record.question : "";
  const options = Array.isArray(record.options)
    ? record.options.filter((o): o is string => typeof o === "string")
    : [];

  let expiresInMinutes: number | undefined;
  if (typeof record.expiresInMinutes === "number" && record.expiresInMinutes > 0) {
    expiresInMinutes = record.expiresInMinutes;
  }

  const poll = createPoll(question, options, {
    allowVoteSwitching: record.allowVoteSwitching === true,
    expiresInMinutes,
  });

  if (typeof record.expiresAt === "string" && !Number.isNaN(new Date(record.expiresAt).getTime())) {
    poll.expiresAt = record.expiresAt;
  }

  return isValidPollData(poll) ? poll : null;
}
