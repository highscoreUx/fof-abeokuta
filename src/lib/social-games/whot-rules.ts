import type { WhotCard, WhotPickPenalty, WhotShape } from "@/lib/social-games/game-state-types";
import type { WhotRuleSettings } from "@/lib/chat-game-whot-settings";

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

function canPlayUnderPenalty(
  card: WhotCard,
  penalty: WhotPickPenalty,
  rules: WhotRuleSettings,
): boolean {
  if (penalty.kind === "two") {
    if (!rules.pick2AllowBlock) return false;
    if (card.shape === "whot") return true;
    return card.number === 2;
  }
  if (penalty.kind === "three") {
    if (!rules.allowPick3 || !rules.pick3AllowBlock) return false;
    if (card.shape === "whot") return true;
    return card.number === 5;
  }
  return false;
}

export function canPlayWhotCard(
  card: WhotCard,
  top: WhotCard | undefined,
  shape: WhotShape | null,
  pickPenalty: WhotPickPenalty | null,
  rules?: WhotRuleSettings,
): boolean {
  if (pickPenalty) return canPlayUnderPenalty(card, pickPenalty, rules ?? {
    pick2AllowBlock: true,
    pick2AllowStacking: true,
    allowPick3: false,
    pick3AllowBlock: true,
    pick3AllowStacking: true,
    allowSuspension: false,
  });
  return canPlayNormal(card, top, shape);
}

export function isWhotPickBlock(
  card: WhotCard,
  penalty: WhotPickPenalty | null,
): boolean {
  if (!penalty || card.shape === "whot") return false;
  if (penalty.kind === "two" && card.number === 2) return true;
  if (penalty.kind === "three" && card.number === 5) return true;
  return false;
}

export const WHOT_SPECIAL_LABELS: Record<number, string> = {
  1: "Hold On",
  2: "Pick Two",
  5: "Pick Three",
  8: "Suspension",
  14: "General Market",
  20: "Whot",
};
