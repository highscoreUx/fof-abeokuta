import type { WhotCard } from "@/lib/social-games/game-state-types";
import { whotStarScorePoints } from "@/lib/social-games/whot-deck";

/** Scoring value of a card (stars count double; Whot = 20). */
export function whotCardPoints(card: WhotCard): number {
  if (card.shape === "whot") return 20;
  if (card.shape === "star") return card.scorePoints ?? whotStarScorePoints(card.number);
  return card.number;
}

export function whotHandPoints(hand: WhotCard[]): number {
  return hand.reduce((sum, card) => sum + whotCardPoints(card), 0);
}

export function computeWhotTenderTotals(
  hands: Record<string, WhotCard[]>,
  playerOrder: string[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const userId of playerOrder) {
    totals[userId] = whotHandPoints(hands[userId] ?? []);
  }
  return totals;
}

/** Lowest total wins; ties broken by earliest in player order. */
export function resolveWhotTenderWinner(
  totals: Record<string, number>,
  playerOrder: string[],
): string | null {
  let winner: string | null = null;
  let best = Infinity;
  for (const userId of playerOrder) {
    const score = totals[userId] ?? Infinity;
    if (score < best) {
      best = score;
      winner = userId;
    }
  }
  return winner;
}

export function isWhotMarketExhausted(deckLength: number): boolean {
  return deckLength === 0;
}
