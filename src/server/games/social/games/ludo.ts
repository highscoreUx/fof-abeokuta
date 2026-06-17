export interface LudoPiece {
  id: number;
  position: number;
}

export interface LudoState {
  pieces: Record<string, LudoPiece[]>;
  dice: number | null;
  playerOrder: string[];
  lastRoll: number | null;
}

const HOME = -1;
const TRACK_LEN = 52;
const HOME_STRETCH = 6;

function createPieces(): LudoPiece[] {
  return [
    { id: 0, position: HOME },
    { id: 1, position: HOME },
    { id: 2, position: HOME },
    { id: 3, position: HOME },
  ];
}

export function createLudoState(playerIds: string[]): LudoState {
  const pieces: Record<string, LudoPiece[]> = {};
  for (const id of playerIds) {
    pieces[id] = createPieces();
  }
  return {
    pieces,
    dice: null,
    playerOrder: [...playerIds],
    lastRoll: null,
  };
}

function seatIndex(state: LudoState, userId: string): number {
  return state.playerOrder.indexOf(userId);
}

function startSquare(seat: number): number {
  return seat * 13;
}

export function rollLudoDice(state: LudoState): LudoState {
  const dice = Math.floor(Math.random() * 6) + 1;
  return { ...state, dice, lastRoll: dice };
}

export function applyLudoMove(
  state: LudoState,
  userId: string,
  pieceId: number,
): { state: LudoState; winnerUserId: string | null; error?: string } {
  if (state.dice == null) return { state, winnerUserId: null, error: "Roll the dice first." };

  const seat = seatIndex(state, userId);
  if (seat < 0) return { state, winnerUserId: null, error: "Not in game." };

  const pieces = state.pieces[userId] ?? [];
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) return { state, winnerUserId: null, error: "Piece not found." };

  const dice = state.dice;
  let nextPos = piece.position;

  if (piece.position === HOME) {
    if (dice !== 6) return { state, winnerUserId: null, error: "Need a 6 to leave home." };
    nextPos = startSquare(seat);
  } else {
    nextPos = piece.position + dice;
    const finishLine = startSquare(seat) + TRACK_LEN;
    if (nextPos > finishLine) {
      return { state, winnerUserId: null, error: "Move overshoots finish." };
    }
  }

  const updatedPieces = pieces.map((p) =>
    p.id === pieceId ? { ...p, position: nextPos } : p,
  );
  const allPieces = { ...state.pieces, [userId]: updatedPieces };

  const winnerUserId =
    updatedPieces.every((p) => p.position >= startSquare(seat) + TRACK_LEN) ? userId : null;

  return {
    state: {
      ...state,
      pieces: allPieces,
      dice: dice === 6 ? null : state.dice,
    },
    winnerUserId,
  };
}

export function nextLudoPlayer(state: LudoState, currentUserId: string, rolledSix: boolean): string {
  if (rolledSix) return currentUserId;
  const idx = state.playerOrder.indexOf(currentUserId);
  return state.playerOrder[(idx + 1) % state.playerOrder.length]!;
}

export function ludoPieceHome(seat: number): number {
  return startSquare(seat) + TRACK_LEN;
}

export { HOME, TRACK_LEN, HOME_STRETCH };
