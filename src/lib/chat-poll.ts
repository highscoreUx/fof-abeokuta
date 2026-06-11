export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_MAX_QUESTION = 200;
export const POLL_MAX_OPTION = 100;

export interface ChatPollData {
  type: "poll";
  question: string;
  options: string[];
  /** userId → selected option index */
  voters: Record<string, number>;
}

export function createEmptyPoll(question: string, options: string[]): ChatPollData {
  return {
    type: "poll",
    question: question.trim(),
    options: options.map((o) => o.trim()).filter(Boolean),
    voters: {},
  };
}

export function isValidPollData(data: ChatPollData): boolean {
  if (data.type !== "poll") return false;
  if (!data.question.trim() || data.question.length > POLL_MAX_QUESTION) return false;
  if (data.options.length < POLL_MIN_OPTIONS || data.options.length > POLL_MAX_OPTIONS) {
    return false;
  }
  if (data.options.some((o) => !o.trim() || o.length > POLL_MAX_OPTION)) return false;
  if (!data.voters || typeof data.voters !== "object") return false;
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
    };

    return isValidPollData(poll) ? poll : null;
  } catch {
    return null;
  }
}

export function serializePoll(poll: ChatPollData): string {
  return JSON.stringify(poll);
}

export function castPollVote(
  poll: ChatPollData,
  userId: string,
  optionIndex: number,
): ChatPollData {
  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    throw new Error("Invalid option");
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
