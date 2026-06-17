export type WhotShape = "circle" | "triangle" | "cross" | "square" | "star" | "whot";

export interface WhotCard {
  id: string;
  number: number;
  shape: WhotShape;
}

export interface WhotState {
  deck: WhotCard[];
  hands: Record<string, WhotCard[]>;
  discard: WhotCard[];
  currentShape: WhotShape | null;
  drawStack: number;
  playerOrder: string[];
}

const SHAPES: WhotShape[] = ["circle", "triangle", "cross", "square", "star"];

function buildDeck(): WhotCard[] {
  const cards: WhotCard[] = [];
  let id = 0;
  for (const shape of SHAPES) {
    for (let n = 1; n <= 14; n++) {
      const count = n === 1 || n === 8 || n === 14 ? 2 : n === 5 ? 3 : 1;
      for (let c = 0; c < count; c++) {
        cards.push({ id: `c${id++}`, number: n, shape });
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    cards.push({ id: `w${i}`, number: 20, shape: "whot" });
  }
  return shuffle(cards);
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function createWhotState(playerIds: string[]): WhotState {
  let deck = buildDeck();
  const hands: Record<string, WhotCard[]> = {};
  for (const userId of playerIds) {
    hands[userId] = deck.slice(0, 6);
    deck = deck.slice(6);
  }
  let discard: WhotCard[] = [];
  while (deck.length > 0) {
    const top = deck.pop()!;
    discard = [top];
    if (top.shape !== "whot") break;
  }
  return {
    deck,
    hands,
    discard,
    currentShape: discard[0]?.shape === "whot" ? null : (discard[0]?.shape ?? null),
    drawStack: 0,
    playerOrder: [...playerIds],
  };
}

function canPlay(card: WhotCard, top: WhotCard | undefined, shape: WhotShape | null): boolean {
  if (!top) return true;
  if (card.shape === "whot") return true;
  if (shape && card.shape === shape) return true;
  if (card.number === top.number) return true;
  return false;
}

export function applyWhotPlay(
  state: WhotState,
  userId: string,
  cardId: string,
  chosenShape?: WhotShape,
): { state: WhotState; winnerUserId: string | null; error?: string } {
  const hand = state.hands[userId] ?? [];
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  if (cardIndex < 0) return { state, winnerUserId: null, error: "Card not in hand." };

  const top = state.discard[0];
  const card = hand[cardIndex]!;
  if (!canPlay(card, top, state.currentShape)) {
    return { state, winnerUserId: null, error: "Cannot play that card." };
  }

  const nextHand = hand.filter((c) => c.id !== cardId);
  let currentShape: WhotShape | null = card.shape;
  if (card.shape === "whot") {
    if (!chosenShape || chosenShape === "whot") {
      return { state, winnerUserId: null, error: "Choose a shape for Whot." };
    }
    currentShape = chosenShape;
  }

  const hands = { ...state.hands, [userId]: nextHand };
  const discard = [card, ...state.discard];

  if (nextHand.length === 0) {
    return {
      state: { ...state, hands, discard, currentShape, drawStack: 0 },
      winnerUserId: userId,
    };
  }

  return {
    state: { ...state, hands, discard, currentShape, drawStack: 0 },
    winnerUserId: null,
  };
}

export function applyWhotDraw(
  state: WhotState,
  userId: string,
): { state: WhotState; error?: string } {
  if (state.deck.length === 0) {
    return { state, error: "No cards left to draw." };
  }
  const count = Math.max(1, state.drawStack + 1);
  const drawn = state.deck.slice(0, count);
  const deck = state.deck.slice(count);
  const hands = {
    ...state.hands,
    [userId]: [...(state.hands[userId] ?? []), ...drawn],
  };
  return {
    state: { ...state, deck, hands, drawStack: 0 },
  };
}

export function nextWhotPlayer(state: WhotState, currentUserId: string): string {
  const idx = state.playerOrder.indexOf(currentUserId);
  if (idx < 0) return state.playerOrder[0]!;
  return state.playerOrder[(idx + 1) % state.playerOrder.length]!;
}
