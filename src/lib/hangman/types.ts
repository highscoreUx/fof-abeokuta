export type HangmanMode = "CHAMPION" | "COUNCIL";
export type HangmanMark = "X" | "O";
export type HangmanMatchState = "WAITING" | "ACTIVE" | "FINISHED";

export const HANGMAN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const DEFAULT_MAX_WRONG_GUESSES = 6;

export interface HangmanTeamInfo {
  id: string;
  letter: string;
  name: string;
  color: string;
}

export interface HangmanChampionInfo {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface HangmanMatchSnapshot {
  matchId: string;
  challengeId: string;
  challengeTitle: string;
  mode: HangmanMode;
  state: HangmanMatchState;
  wordMask: string;
  guessedLetters: string[];
  wrongGuessesX: number;
  wrongGuessesO: number;
  maxWrongGuesses: number;
  currentTurn: HangmanMark;
  turnNumber: number;
  teamX: HangmanTeamInfo;
  teamO: HangmanTeamInfo;
  championX: HangmanChampionInfo | null;
  championO: HangmanChampionInfo | null;
  councilVotes: Record<string, string>;
  councilVoteCounts: Record<string, number>;
  winnerTeamId: string | null;
  revealedWord: string | null;
  serverNow: number;
}

export interface HangmanChallengeConfig {
  words?: string[];
}

export function parseHangmanWords(config: unknown): string[] {
  const raw = config as HangmanChallengeConfig | null;
  if (!Array.isArray(raw?.words)) return [];
  return raw.words
    .map((word) => normalizeHangmanWord(String(word)))
    .filter(Boolean);
}

export function normalizeHangmanWord(word: string): string {
  return word
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ");
}

export function buildWordMask(word: string, guessedLetters: string[]): string {
  const guessed = new Set(guessedLetters.map((l) => l.toUpperCase()));
  return word
    .split("")
    .map((char) => {
      if (char === " ") return " ";
      return guessed.has(char) ? char : "_";
    })
    .join("");
}

export function formatWordMaskDisplay(mask: string): string {
  return mask
    .split("")
    .map((char) => (char === " " ? "  " : char))
    .join(" ");
}

export function isWordComplete(word: string, guessedLetters: string[]): boolean {
  const guessed = new Set(guessedLetters.map((l) => l.toUpperCase()));
  return word.split("").every((char) => char === " " || guessed.has(char));
}

export function isLetterInWord(letter: string, word: string): boolean {
  return word.toUpperCase().includes(letter.toUpperCase());
}

export function pickRandomWord(words: string[]): string {
  if (words.length === 0) throw new Error("Add at least one word before starting a match.");
  const index = Math.floor(Math.random() * words.length);
  return words[index]!;
}
