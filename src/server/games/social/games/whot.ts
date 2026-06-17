import type {
  WhotCard,
  WhotLastCardCall,
  WhotPickPenalty,
  WhotShape,
  WhotState,
} from "@/lib/social-games/game-state-types";
import type { SocialWhotSettings } from "@/lib/chat-game-whot-settings";
import { buildWhotDeck } from "@/lib/social-games/whot-deck";
import { canPlayWhotCard } from "@/lib/social-games/whot-rules";

export { canPlayWhotCard } from "@/lib/social-games/whot-rules";

export type { WhotShape };

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function refillDeckFromDiscard(state: WhotState): WhotState {
  if (state.deck.length > 0 || state.discard.length <= 1) return state;
  const [top, ...rest] = state.discard;
  return { ...state, deck: shuffle(rest), discard: top ? [top] : [] };
}

function drawCards(state: WhotState, count: number): { state: WhotState; drawn: WhotCard[] } {
  let next = refillDeckFromDiscard(state);
  const drawn: WhotCard[] = [];
  for (let i = 0; i < count; i++) {
    if (next.deck.length === 0) {
      next = refillDeckFromDiscard(next);
      if (next.deck.length === 0) break;
    }
    const card = next.deck[0]!;
    drawn.push(card);
    next = { ...next, deck: next.deck.slice(1) };
  }
  return { state: next, drawn };
}

function applyGeneralMarket(state: WhotState, playedBy: string): WhotState {
  let next = state;
  const hands = { ...state.hands };
  for (const userId of state.playerOrder) {
    if (userId === playedBy) continue;
    const { state: afterDraw, drawn } = drawCards(next, 1);
    next = afterDraw;
    hands[userId] = [...(hands[userId] ?? []), ...drawn];
  }
  return { ...next, hands };
}

export function createWhotState(
  playerIds: string[],
  settings?: Pick<SocialWhotSettings, "cardsPerPlayer">,
): WhotState {
  let deck = shuffle(buildWhotDeck());
  const dealCount = settings?.cardsPerPlayer ?? 6;
  const hands: Record<string, WhotCard[]> = {};
  for (const userId of playerIds) {
    hands[userId] = deck.slice(0, dealCount);
    deck = deck.slice(dealCount);
  }

  let discard: WhotCard[] = [];
  while (deck.length > 0) {
    const top = deck.pop()!;
    discard = [top];
    if (top.shape !== "whot") break;
  }

  const calledLastCard: Record<string, WhotLastCardCall | null> = {};
  for (const userId of playerIds) {
    calledLastCard[userId] = null;
  }

  return {
    deck,
    hands,
    discard,
    currentShape: discard[0]?.shape === "whot" ? null : (discard[0]?.shape ?? null),
    playerOrder: [...playerIds],
    pickPenalty: null,
    pendingSkips: 0,
    holdOn: false,
    calledLastCard,
  };
}

function stackPickPenalty(
  penalty: WhotPickPenalty | null,
  kind: WhotPickPenalty["kind"],
): WhotPickPenalty {
  if (penalty?.kind === kind) return { kind, stack: penalty.stack + 1 };
  return { kind, stack: 1 };
}

function applySpecialCardEffects(
  state: WhotState,
  userId: string,
  card: WhotCard,
): WhotState {
  if (card.shape === "whot") return state;

  let next = state;
  switch (card.number) {
    case 1:
      next = { ...next, holdOn: true };
      break;
    case 2:
      next = { ...next, pickPenalty: stackPickPenalty(next.pickPenalty, "two") };
      break;
    case 5:
      next = { ...next, pickPenalty: stackPickPenalty(next.pickPenalty, "three") };
      break;
    case 8:
      next = { ...next, pendingSkips: card.shape === "star" ? 2 : 1 };
      break;
    case 14:
      next = applyGeneralMarket(next, userId);
      break;
    default:
      break;
  }
  return next;
}

export function advanceWhotPlayer(state: WhotState, currentUserId: string): string {
  const idx = state.playerOrder.indexOf(currentUserId);
  if (idx < 0) return state.playerOrder[0]!;
  const steps = 1 + Math.max(0, state.pendingSkips);
  return state.playerOrder[(idx + steps) % state.playerOrder.length]!;
}

export function resolveWhotTurnAfterPlay(
  state: WhotState,
  userId: string,
  card: WhotCard,
): { state: WhotState; nextTurnUserId: string } {
  let next = applySpecialCardEffects(state, userId, card);

  if (next.holdOn) {
    return {
      state: { ...next, holdOn: false, pendingSkips: 0 },
      nextTurnUserId: userId,
    };
  }

  const skips = next.pendingSkips;
  next = { ...next, pendingSkips: 0 };
  return {
    state: next,
    nextTurnUserId: advanceWhotPlayer({ ...next, pendingSkips: skips }, userId),
  };
}

function applyLastCardPenalty(
  state: WhotState,
  userId: string,
  penaltyCards: number,
): WhotState {
  const { state: afterDraw, drawn } = drawCards(state, penaltyCards);
  return {
    ...afterDraw,
    hands: {
      ...afterDraw.hands,
      [userId]: [...(afterDraw.hands[userId] ?? []), ...drawn],
    },
    calledLastCard: { ...(afterDraw.calledLastCard ?? {}), [userId]: null },
  };
}

export function applyWhotAnnounce(
  state: WhotState,
  userId: string,
  call: WhotLastCardCall,
): { state: WhotState; error?: string } {
  const handSize = state.hands[userId]?.length ?? 0;
  if (call === "semi" && handSize !== 2) {
    return { state, error: 'Call "semi last card" only when you have two cards.' };
  }
  if (call === "last" && handSize !== 1) {
    return { state, error: 'Call "last card" only when you have one card.' };
  }
  return {
    state: {
      ...state,
      calledLastCard: { ...(state.calledLastCard ?? {}), [userId]: call },
    },
  };
}

export function applyWhotPlay(
  state: WhotState,
  userId: string,
  cardId: string,
  chosenShape?: WhotShape,
  settings?: Pick<SocialWhotSettings, "enforceLastCardCall" | "lastCardPenaltyCards">,
): { state: WhotState; winnerUserId: string | null; error?: string } {
  const hand = state.hands[userId] ?? [];
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  if (cardIndex < 0) return { state, winnerUserId: null, error: "Card not in hand." };

  const top = state.discard[0];
  const card = hand[cardIndex]!;
  if (!canPlayWhotCard(card, top, state.currentShape, state.pickPenalty)) {
    return { state, winnerUserId: null, error: "Cannot play that card." };
  }

  let currentShape: WhotShape | null = card.shape;
  if (card.shape === "whot") {
    if (!chosenShape || chosenShape === "whot") {
      return { state, winnerUserId: null, error: "Choose a shape for Whot." };
    }
    currentShape = chosenShape;
  }

  const nextHand = hand.filter((c) => c.id !== cardId);
  let nextState: WhotState = applySpecialCardEffects(
    {
      ...state,
      hands: { ...state.hands, [userId]: nextHand },
      discard: [card, ...state.discard],
      currentShape,
    },
    userId,
    card,
  );

  if (nextHand.length === 0) {
    if (
      settings?.enforceLastCardCall &&
      state.calledLastCard?.[userId] !== "last"
    ) {
      const penalised = applyLastCardPenalty(
        { ...nextState, hands: { ...nextState.hands, [userId]: nextHand } },
        userId,
        settings.lastCardPenaltyCards ?? 2,
      );
      return { state: penalised, winnerUserId: null };
    }
    return {
      state: { ...nextState, pickPenalty: null, pendingSkips: 0, holdOn: false },
      winnerUserId: userId,
    };
  }

  if (nextHand.length === 2 && nextState.calledLastCard?.[userId] !== "semi") {
    // Player should call semi — no block, just a reminder in UI.
  }
  if (nextHand.length === 1) {
    nextState.calledLastCard = { ...(nextState.calledLastCard ?? {}), [userId]: null };
  }

  return { state: nextState, winnerUserId: null };
}

export function applyWhotDraw(
  state: WhotState,
  userId: string,
): { state: WhotState; error?: string } {
  const penalty = state.pickPenalty;
  const drawCount = penalty
    ? penalty.stack * (penalty.kind === "two" ? 2 : 3)
    : 1;

  const { state: afterDraw, drawn } = drawCards(state, drawCount);
  if (drawn.length === 0) {
    return { state, error: "No cards left to draw." };
  }

  return {
    state: {
      ...afterDraw,
      hands: {
        ...afterDraw.hands,
        [userId]: [...(afterDraw.hands[userId] ?? []), ...drawn],
      },
      pickPenalty: null,
      calledLastCard: { ...(afterDraw.calledLastCard ?? {}), [userId]: null },
    },
  };
}

export function nextWhotPlayer(state: WhotState, currentUserId: string): string {
  return advanceWhotPlayer(state, currentUserId);
}
