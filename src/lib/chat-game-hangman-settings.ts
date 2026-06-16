import { normalizeHangmanWord } from "@/lib/hangman/types";

export type SocialHangmanSeriesMode = "single" | "race";

export interface SocialHangmanSettings {
  seriesMode: SocialHangmanSeriesMode;
  raceTarget: number;
  maxWrongGuesses: number;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
  words: string[];
}

export interface SocialHangmanScore {
  x: number;
  o: number;
}

export const DEFAULT_SOCIAL_HANGMAN_WORDS = [
  "FIGMA",
  "DESIGN",
  "PIXEL",
  "LAYOUT",
  "FONT",
  "COLOR",
  "GRID",
  "STYLE",
  "VECTOR",
  "CANVAS",
];

export const DEFAULT_SOCIAL_HANGMAN_SETTINGS: SocialHangmanSettings = {
  seriesMode: "single",
  raceTarget: 3,
  maxWrongGuesses: 6,
  turnTimerEnabled: false,
  turnTimerSeconds: 30,
  words: [...DEFAULT_SOCIAL_HANGMAN_WORDS],
};

const RACE_TARGET_MIN = 1;
const RACE_TARGET_MAX = 9;
const TURN_SECONDS_MIN = 5;
const TURN_SECONDS_MAX = 300;
const MAX_WRONG_MIN = 3;
const MAX_WRONG_MAX = 12;

export function parseSocialHangmanWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SOCIAL_HANGMAN_WORDS];
  const words = raw
    .map((word) => normalizeHangmanWord(String(word)))
    .filter(Boolean);
  return words.length > 0 ? words : [...DEFAULT_SOCIAL_HANGMAN_WORDS];
}

export function parseWordsFromText(text: string): string[] {
  const words = text
    .split(/\r?\n/)
    .map((line) => normalizeHangmanWord(line))
    .filter(Boolean);
  return [...new Set(words)];
}

export function formatWordsForTextarea(words: string[]): string {
  return words.join("\n");
}

export function parseSocialHangmanSettings(raw: unknown): SocialHangmanSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_HANGMAN_SETTINGS };
  const value = raw as Partial<SocialHangmanSettings>;
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

  return {
    seriesMode: value.seriesMode === "race" ? "race" : "single",
    raceTarget,
    maxWrongGuesses,
    turnTimerEnabled: Boolean(value.turnTimerEnabled),
    turnTimerSeconds,
    words: parseSocialHangmanWords(value.words),
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
  return parseSocialHangmanSettings({ ...DEFAULT_SOCIAL_HANGMAN_SETTINGS, ...input });
}
