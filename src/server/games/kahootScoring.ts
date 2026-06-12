/** Kahoot classic scoring constants. */
export const KAHOOT_MAX_POINTS = 1000;
export const KAHOOT_MIN_CORRECT_POINTS = 500;

/** Results screen duration before auto-advancing (Kahoot-style). */
export const KAHOOT_RESULTS_DURATION_MS = 8_000;

/** Kahoot answer button colors (red, blue, yellow, green). */
export const KAHOOT_OPTION_STYLES = [
  { bg: "bg-[#e21b3c]", shape: "▲", label: "Red" },
  { bg: "bg-[#1368ce]", shape: "◆", label: "Blue" },
  { bg: "bg-[#d89e00]", shape: "●", label: "Yellow" },
  { bg: "bg-[#26890c]", shape: "■", label: "Green" },
] as const;

/**
 * Kahoot points for a correct answer: faster = more points (500–1000).
 * Wrong answers always score 0.
 */
export function calculateSpeedPoints(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitMs: number,
): number {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(responseTimeMs, timeLimitMs));
  const ratio = clampedTime / timeLimitMs;
  const base = Math.round((1 - ratio / 2) * KAHOOT_MAX_POINTS);
  return Math.max(KAHOOT_MIN_CORRECT_POINTS, base);
}

/**
 * Streak multiplier after a correct answer (Kahoot answer streak).
 * Applied to the current question's speed points.
 */
export function getStreakMultiplier(streakAfterAnswer: number): number {
  if (streakAfterAnswer >= 15) return 5;
  if (streakAfterAnswer >= 10) return 4;
  if (streakAfterAnswer >= 6) return 3;
  if (streakAfterAnswer >= 3) return 2;
  return 1;
}

export function computeStreakBeforeAnswer(
  priorAnswers: Array<{ isCorrect: boolean; questionId: string }>,
  orderedQuestionIds: string[],
  currentQuestionId: string,
): number {
  const currentIndex = orderedQuestionIds.indexOf(currentQuestionId);
  if (currentIndex <= 0) return 0;

  const priorQuestionIds = new Set(orderedQuestionIds.slice(0, currentIndex));
  const relevant = priorAnswers
    .filter((a) => priorQuestionIds.has(a.questionId))
    .sort(
      (a, b) =>
        orderedQuestionIds.indexOf(a.questionId) - orderedQuestionIds.indexOf(b.questionId),
    );

  let streak = 0;
  for (const answer of relevant) {
    if (answer.isCorrect) streak += 1;
    else streak = 0;
  }
  return streak;
}

export function calculateQuestionScore(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitMs: number,
  streakBefore: number,
): { points: number; streakAfter: number; multiplier: number; speedPoints: number } {
  const streakAfter = isCorrect ? streakBefore + 1 : 0;
  const multiplier = isCorrect ? getStreakMultiplier(streakAfter) : 1;
  const speedPoints = calculateSpeedPoints(isCorrect, responseTimeMs, timeLimitMs);
  const points = Math.round(speedPoints * multiplier);
  return { points, streakAfter, multiplier, speedPoints };
}

export function computeAccuracy(correct: number, answered: number): number {
  if (answered === 0) return 0;
  return Math.round((correct / answered) * 100);
}
