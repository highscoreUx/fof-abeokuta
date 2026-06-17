import type { LudoDieChoice, LudoDiceRoll, LudoPiece, LudoState } from "@/lib/social-games/game-state-types";
import { LUDO_SEEDS_PER_CORNER, LUDO_TWO_PLAYER_SEATS } from "@/lib/social-games/game-state-types";
import {
  ludoDiceUsed,
  ludoEnterPosition,
  ludoFinishPosition,
  ludoHasLegalMove,
  ludoIsDoubleSix,
  ludoIsPieceFinished,
  ludoIsPieceOnTrack,
  ludoLegalChoicesForPiece,
  ludoMarkDiceUsed,
  ludoStepsForChoice,
} from "@/lib/social-games/ludo-rules";
import { applyLudoCaptures, ludoCanLandAt } from "@/lib/social-games/ludo-captures";

export {
  ludoDiceSum,
  ludoHasLegalMove,
  ludoHasSix,
  ludoIsDoubles,
  ludoIsDoubleSix,
} from "@/lib/social-games/ludo-rules";

const HOME = -1;
const TRACK_LEN = 52;

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function cornersForPlayer(playerIndex: number, playerCount: number): number[] {
  if (playerCount === 2) {
    return [...LUDO_TWO_PLAYER_SEATS[playerIndex]!];
  }
  return [playerIndex];
}

function createPiecesForPlayer(playerIndex: number, playerCount: number): LudoPiece[] {
  const corners = cornersForPlayer(playerIndex, playerCount);

  if (playerCount === 2) {
    const firstCorner: LudoPiece[] = Array.from({ length: LUDO_SEEDS_PER_CORNER }, (_, id) => ({
      id,
      position: HOME,
      homeSeat: corners[0]!,
    }));
    const secondCorner: LudoPiece[] = Array.from({ length: LUDO_SEEDS_PER_CORNER }, (_, offset) => ({
      id: LUDO_SEEDS_PER_CORNER + offset,
      position: HOME,
      homeSeat: corners[1]!,
    }));
    return [...firstCorner, ...secondCorner];
  }

  return Array.from({ length: LUDO_SEEDS_PER_CORNER }, (_, id) => ({
    id,
    position: HOME,
    homeSeat: playerIndex,
  }));
}

export function createLudoState(playerIds: string[]): LudoState {
  const mode = playerIds.length === 2 ? "two_player" : "standard";
  const pieces: Record<string, LudoPiece[]> = {};
  const playerSeats: Record<string, number[]> = {};

  playerIds.forEach((userId, index) => {
    pieces[userId] = createPiecesForPlayer(index, playerIds.length);
    playerSeats[userId] = cornersForPlayer(index, playerIds.length);
  });

  return {
    pieces,
    dice: null,
    diceUsed: [false, false],
    playerOrder: [...playerIds],
    lastRoll: null,
    lastRollUserId: null,
    mode,
    playerSeats,
  };
}

export function parseLudoDieChoice(value: unknown): LudoDieChoice | null {
  if (value === "sum") return "sum";
  if (value === 0 || value === 1) return value;
  if (value === "0") return 0;
  if (value === "1") return 1;
  return null;
}

export function passLudoTurn(state: LudoState, userId: string): LudoState {
  return {
    ...state,
    dice: null,
    diceUsed: [false, false],
    lastRollUserId: state.lastRollUserId ?? userId,
    capturedThisTurn: false,
  };
}

export function rollLudoDice(state: LudoState, userId: string): LudoState {
  const dice: LudoDiceRoll = [rollDie(), rollDie()];
  return {
    ...state,
    dice,
    diceUsed: [false, false],
    lastRoll: dice,
    lastRollUserId: userId,
    capturedThisTurn: false,
  };
}

export function applyLudoMove(
  state: LudoState,
  userId: string,
  pieceId: number,
  dieChoice: LudoDieChoice,
): { state: LudoState; winnerUserId: string | null; error?: string } {
  if (state.dice == null) {
    return { state, winnerUserId: null, error: "Roll the dice first." };
  }

  const ownedSeats = state.playerSeats[userId];
  if (!ownedSeats?.length) {
    return { state, winnerUserId: null, error: "Not in game." };
  }

  const pieces = state.pieces[userId] ?? [];
  const piece = pieces.find((entry) => entry.id === pieceId);
  if (!piece) return { state, winnerUserId: null, error: "Piece not found." };
  if (!ownedSeats.includes(piece.homeSeat)) {
    return { state, winnerUserId: null, error: "Invalid piece." };
  }

  const legalChoices = ludoLegalChoicesForPiece(state, userId, piece);
  if (!legalChoices.includes(dieChoice)) {
    return { state, winnerUserId: null, error: "That die value cannot move this seed." };
  }

  const steps = ludoStepsForChoice(state, dieChoice);
  if (steps == null) {
    return { state, winnerUserId: null, error: "Die already used." };
  }

  const enteringFromYard = !ludoIsPieceOnTrack(piece);
  let nextPos = piece.position;
  if (enteringFromYard) {
    if (steps !== 6) {
      return { state, winnerUserId: null, error: "Need a 6 on a die to leave home." };
    }
    nextPos = ludoEnterPosition(piece.homeSeat);
  } else {
    nextPos = piece.position + steps;
    if (nextPos > ludoFinishPosition(piece.homeSeat)) {
      return { state, winnerUserId: null, error: "Move overshoots finish." };
    }
  }

  if (!ludoCanLandAt(state, userId, piece, nextPos)) {
    return { state, winnerUserId: null, error: "Cannot land on that square." };
  }

  const updatedPieces = pieces.map((entry) =>
    entry.id === pieceId ? { ...entry, position: nextPos } : entry,
  );
  let allPieces = { ...state.pieces, [userId]: updatedPieces };

  const { pieces: afterCapture, captured } = applyLudoCaptures(
    allPieces,
    userId,
    piece.homeSeat,
    nextPos,
    enteringFromYard,
  );
  allPieces = afterCapture;

  const winnerUserId = (allPieces[userId] ?? []).every((entry) => ludoIsPieceFinished(entry))
    ? userId
    : null;

  const diceUsed = ludoMarkDiceUsed(ludoDiceUsed(state), dieChoice);

  return {
    state: {
      ...state,
      pieces: allPieces,
      diceUsed,
      capturedThisTurn: Boolean(state.capturedThisTurn) || captured > 0,
    },
    winnerUserId,
  };
}

export function resolveLudoTurnAfterMove(
  state: LudoState,
  userId: string,
  initialRoll: LudoDiceRoll,
  winnerUserId: string | null,
): { state: LudoState; nextTurnUserId: string | null } {
  if (winnerUserId) {
    return { state: passLudoTurn(state, userId), nextTurnUserId: null };
  }

  if (ludoHasLegalMove(state, userId)) {
    return { state, nextTurnUserId: userId };
  }

  const cleared = passLudoTurn(state, userId);
  const extraTurn = ludoIsDoubleSix(initialRoll) || Boolean(state.capturedThisTurn);
  const nextTurnUserId = extraTurn ? userId : nextLudoPlayer(state, userId);
  return { state: cleared, nextTurnUserId };
}

export function nextLudoPlayer(state: LudoState, currentUserId: string): string {
  const idx = state.playerOrder.indexOf(currentUserId);
  return state.playerOrder[(idx + 1) % state.playerOrder.length]!;
}

export function ludoPieceHome(homeSeat: number): number {
  return ludoFinishPosition(homeSeat);
}

export { HOME as LUDO_HOME, TRACK_LEN as LUDO_TRACK_LEN };
