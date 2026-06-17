import type { WhotLastCardCall, WhotState } from "@/lib/social-games/game-state-types";

type LegacyWhotState = Partial<WhotState> & { drawStack?: number };

/** Normalize persisted state (including pre-migration matches). */
export function prepareWhotStateForPlay(raw: unknown, playerIds: string[]): WhotState {
  const state = (raw && typeof raw === "object" ? raw : {}) as LegacyWhotState;
  const playerOrder =
    Array.isArray(state.playerOrder) && state.playerOrder.length > 0
      ? state.playerOrder
      : [...playerIds];

  const calledLastCard: Record<string, WhotLastCardCall | null> = {
    ...(state.calledLastCard ?? {}),
  };
  for (const userId of playerOrder) {
    if (!(userId in calledLastCard)) calledLastCard[userId] = null;
  }

  let pickPenalty = state.pickPenalty ?? null;
  if (!pickPenalty && typeof state.drawStack === "number" && state.drawStack > 0) {
    pickPenalty = { kind: "two", stack: state.drawStack };
  }

  return {
    deck: Array.isArray(state.deck) ? state.deck : [],
    hands: state.hands ?? {},
    discard: Array.isArray(state.discard) ? state.discard : [],
    currentShape: state.currentShape ?? null,
    playerOrder,
    pickPenalty,
    pendingSkips: state.pendingSkips ?? 0,
    holdOn: state.holdOn ?? false,
    calledLastCard,
    tenderTotals: state.tenderTotals,
    endedByTender: state.endedByTender,
  };
}
