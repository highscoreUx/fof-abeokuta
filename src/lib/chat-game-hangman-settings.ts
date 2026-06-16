import { getSocialHangmanTopic } from "@/data/social-hangman/topics";

export type SocialHangmanSeriesMode = "single" | "race";
export type SocialHangmanTopicMode = "random" | "topic";

export interface SocialHangmanSettings {
  seriesMode: SocialHangmanSeriesMode;
  raceTarget: number;
  maxWrongGuesses: number;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
  topicMode: SocialHangmanTopicMode;
  topicId: string | null;
}

export interface SocialHangmanScore {
  x: number;
  o: number;
}

export const DEFAULT_SOCIAL_HANGMAN_SETTINGS: SocialHangmanSettings = {
  seriesMode: "single",
  raceTarget: 3,
  maxWrongGuesses: 6,
  turnTimerEnabled: false,
  turnTimerSeconds: 30,
  topicMode: "random",
  topicId: null,
};

const RACE_TARGET_MIN = 1;
const RACE_TARGET_MAX = 9;
const TURN_SECONDS_MIN = 5;
const TURN_SECONDS_MAX = 300;
const MAX_WRONG_MIN = 3;
const MAX_WRONG_MAX = 12;

export function parseSocialHangmanSettings(raw: unknown): SocialHangmanSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_HANGMAN_SETTINGS };
  const value = raw as Partial<SocialHangmanSettings> & { words?: unknown };
  const raceTarget =
    typeof value.raceTarget === "number"
      ? Math.min(RACE_TARGET_MAX, Math.max(RACE_TARGET_MIN, Math.round(value.raceTarget)))
      : DEFAULT_SOCIAL_HANGMAN_SETTINGS.raceTarget;
  const turnTimerSeconds =
    typeof value.turnTimerSeconds === "number"
      ? Math.min(TURN_SECONDS_MAX, Math.max(TURN_SECONDS_MIN, Math.round(value.turnTimerSeconds)))
      : DEFAULT_SOCIAL_HANGMAN_SETTINGS.turnTimerSeconds;
  const maxWrongGuesses =
    typeof value.maxWrongGuesses === "number"
      ? Math.min(MAX_WRONG_MAX, Math.max(MAX_WRONG_MIN, Math.round(value.maxWrongGuesses)))
      : DEFAULT_SOCIAL_HANGMAN_SETTINGS.maxWrongGuesses;

  const topicMode = value.topicMode === "topic" ? "topic" : "random";
  const topicId =
    topicMode === "topic" && typeof value.topicId === "string" && value.topicId.length > 0
      ? value.topicId
      : null;

  return {
    seriesMode: value.seriesMode === "race" ? "race" : "single",
    raceTarget,
    maxWrongGuesses,
    turnTimerEnabled: Boolean(value.turnTimerEnabled),
    turnTimerSeconds,
    topicMode,
    topicId,
  };
}

export function parseSocialHangmanScore(raw: unknown): SocialHangmanScore {
  if (!raw || typeof raw !== "object") return { x: 0, o: 0 };
  const value = raw as Partial<SocialHangmanScore>;
  return {
    x: typeof value.x === "number" ? Math.max(0, Math.round(value.x)) : 0,
    o: typeof value.o === "number" ? Math.max(0, Math.round(value.o)) : 0,
  };
}

export function normalizeSocialHangmanSettingsInput(
  input: Partial<SocialHangmanSettings>,
): SocialHangmanSettings {
  const merged = { ...DEFAULT_SOCIAL_HANGMAN_SETTINGS, ...input };
  if (merged.topicMode === "random") {
    merged.topicId = null;
  }
  return parseSocialHangmanSettings(merged);
}

export function getSocialHangmanTopicLabel(settings: SocialHangmanSettings): string {
  if (settings.topicMode === "random") return "Random topics";
  if (!settings.topicId) return "Random topics";
  return getSocialHangmanTopic(settings.topicId)?.name ?? "Random topics";
}

// Legacy helper kept for official hangman challenge config only.
export const DEFAULT_SOCIAL_HANGMAN_WORDS = ["FIGMA", "DESIGN", "PIXEL"] as const;
