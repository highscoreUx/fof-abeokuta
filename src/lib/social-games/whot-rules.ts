import type { WhotCard, WhotPickPenalty, WhotShape } from "@/lib/social-games/game-state-types";

function canPlayNormal(
  card: WhotCard,
  top: WhotCard | undefined,
  shape: WhotShape | null,
): boolean {
  if (!top) return true;
  if (card.shape === "whot") return true;
  if (shape && card.shape === shape) return true;
  if (card.number === top.number) return true;
  return false;
}

function canPlayUnderPenalty(card: WhotCard, penalty: WhotPickPenalty): boolean {
  if (card.shape === "whot") return true;
  if (penalty.kind === "two" && card.number === 2) return true;
  if (penalty.kind === "three" && card.number === 5) return true;
  return false;
}

export function canPlayWhotCard(
  card: WhotCard,
  top: WhotCard | undefined,
  shape: WhotShape | null,
  pickPenalty: WhotPickPenalty | null,
): boolean {
  if (pickPenalty) return canPlayUnderPenalty(card, pickPenalty);
  return canPlayNormal(card, top, shape);
}

export const WHOT_SPECIAL_LABELS: Record<number, string> = {
  1: "Hold On",
  2: "Pick Two",
  5: "Pick Three",
  8: "Suspension",
  14: "General Market",
  20: "Whot",
};
