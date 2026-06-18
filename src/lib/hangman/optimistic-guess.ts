import type { HangmanMatchSnapshot } from "@/lib/hangman/types";

export function applyOptimisticHangmanGuess(
  snapshot: HangmanMatchSnapshot,
  letter: string,
): HangmanMatchSnapshot {
  const normalized = letter.toUpperCase();
  if (snapshot.guessedLetters.includes(normalized)) return snapshot;

  return {
    ...snapshot,
    guessedLetters: [...snapshot.guessedLetters, normalized],
    councilVotes: {},
    councilVoteCounts: {},
  };
}

export function findPendingHangmanLetter(
  server: HangmanMatchSnapshot | null,
  display: HangmanMatchSnapshot | null,
): string | null {
  if (!server || !display) return null;
  const serverLetters = new Set(server.guessedLetters.map((entry) => entry.toUpperCase()));
  for (const letter of display.guessedLetters) {
    if (!serverLetters.has(letter.toUpperCase())) return letter.toUpperCase();
  }
  return null;
}
