import type { LudoDiceRoll, LudoPiece, LudoState } from "@/lib/social-games/game-state-types";
import { LUDO_SEEDS_PER_CORNER, LUDO_TWO_PLAYER_SEATS } from "@/lib/social-games/game-state-types";
import {
  ludoDiceSum,
  ludoHasLegalMove,
  ludoHasSix,
} from "@/lib/social-games/ludo-helpers";

export { ludoDiceSum, ludoHasLegalMove, ludoHasSix } from "@/lib/social-games/ludo-helpers";

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
    playerOrder: [...playerIds],
    lastRoll: null,
    mode,
    playerSeats,
  };
}

function startSquare(homeSeat: number): number {
  return homeSeat * 13;
}

function finishLine(homeSeat: number): number {
  return startSquare(homeSeat) + TRACK_LEN;
}

export function ludoIsDoubles(dice: LudoDiceRoll): boolean {
  return dice[0] === dice[1];
}

export function rollLudoDice(state: LudoState): LudoState {
  const dice: LudoDiceRoll = [rollDie(), rollDie()];
  return { ...state, dice, lastRoll: dice };
}

export function applyLudoMove(
  state: LudoState,
  userId: string,
  pieceId: number,
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

  const dice = state.dice;
  const steps = ludoDiceSum(dice);
  let nextPos = piece.position;

  if (piece.position === HOME) {
    if (!ludoHasSix(dice)) {
      return { state, winnerUserId: null, error: "Need a 6 on either die to leave home." };
    }
    nextPos = startSquare(piece.homeSeat);
  } else {
    nextPos = piece.position + steps;
    if (nextPos > finishLine(piece.homeSeat)) {
      return { state, winnerUserId: null, error: "Move overshoots finish." };
    }
  }

  const updatedPieces = pieces.map((entry) =>
    entry.id === pieceId ? { ...entry, position: nextPos } : entry,
  );
  const allPieces = { ...state.pieces, [userId]: updatedPieces };

  const winnerUserId = updatedPieces.every((entry) => entry.position >= finishLine(entry.homeSeat))
    ? userId
    : null;

  return {
    state: {
      ...state,
      pieces: allPieces,
    },
    winnerUserId,
  };
}

export function nextLudoPlayer(state: LudoState, currentUserId: string): string {
  const idx = state.playerOrder.indexOf(currentUserId);
  return state.playerOrder[(idx + 1) % state.playerOrder.length]!;
}

export function ludoPieceHome(homeSeat: number): number {
  return finishLine(homeSeat);
}

export { HOME as LUDO_HOME, TRACK_LEN as LUDO_TRACK_LEN };
