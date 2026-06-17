import type { LudoDiceRoll, LudoPiece, LudoState } from "@/lib/social-games/game-state-types";
import {
  LUDO_SEEDS_PER_CORNER,
  LUDO_TWO_PLAYER_SEATS,
} from "@/lib/social-games/game-state-types";

const HOME = -1;

function cornersForPlayer(playerIndex: number, playerCount: number): number[] {
  if (playerCount === 2) {
    return [...LUDO_TWO_PLAYER_SEATS[playerIndex]!];
  }
  return [playerIndex];
}

function defaultPieces(playerIndex: number, playerCount: number): LudoPiece[] {
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

export function ludoYardSlotIndex(piece: LudoPiece): number {
  return piece.id % LUDO_SEEDS_PER_CORNER;
}

export function ludoDiceSum(dice: LudoDiceRoll): number {
  return dice[0] + dice[1];
}

/** Red+green player: rotate board 180° so their colors sit at the bottom (facing them). */
export function ludoFlipBoardForViewer(mySeats: number[]): boolean {
  if (mySeats.length !== 2) return false;
  return mySeats.every((seat) => seat === 0 || seat === 1);
}

function expandLegacyTwoPlayerPieces(
  existing: LudoPiece[],
  defaults: LudoPiece[],
): LudoPiece[] {
  if (existing.length >= LUDO_SEEDS_PER_CORNER * 2) {
    return existing.map((piece, index) => ({
      ...piece,
      id: piece.id ?? index,
      homeSeat:
        typeof piece.homeSeat === "number"
          ? piece.homeSeat
          : (defaults[index]?.homeSeat ?? 0),
    }));
  }
  return defaults;
}

/** Upgrade legacy match state for the UI. */
export function normalizeLudoState(raw: unknown): LudoState {
  if (!raw || typeof raw !== "object") {
    return {
      pieces: {},
      dice: null,
      playerOrder: [],
      lastRoll: null,
      mode: "standard",
      playerSeats: {},
    };
  }

  const value = raw as Partial<LudoState> & {
    dice?: number | LudoDiceRoll | null;
    lastRoll?: number | LudoDiceRoll | null;
  };

  const playerOrder = Array.isArray(value.playerOrder) ? value.playerOrder : [];
  const mode = value.mode === "two_player" || playerOrder.length === 2 ? "two_player" : "standard";

  const playerSeats: Record<string, number[]> = {};
  const pieces: Record<string, LudoPiece[]> = {};
  playerOrder.forEach((userId, index) => {
    playerSeats[userId] = cornersForPlayer(index, playerOrder.length);
    pieces[userId] = defaultPieces(index, playerOrder.length);
  });

  if (value.playerSeats && typeof value.playerSeats === "object") {
    Object.assign(playerSeats, value.playerSeats);
  }

  if (value.pieces && typeof value.pieces === "object") {
    for (const userId of playerOrder) {
      const existing = (value.pieces as Record<string, LudoPiece[]>)[userId];
      const defaults = pieces[userId] ?? [];
      if (!existing) continue;
      pieces[userId] =
        mode === "two_player"
          ? expandLegacyTwoPlayerPieces(existing, defaults)
          : existing.map((piece, index) => ({
              id: piece.id ?? index,
              position: piece.position ?? HOME,
              homeSeat:
                typeof piece.homeSeat === "number"
                  ? piece.homeSeat
                  : (defaults[index]?.homeSeat ?? 0),
            }));
    }
  }

  const dice =
    value.dice == null
      ? null
      : Array.isArray(value.dice)
        ? ([value.dice[0] ?? 1, value.dice[1] ?? 1] as LudoDiceRoll)
        : ([value.dice, value.dice] as LudoDiceRoll);

  const lastRoll =
    value.lastRoll == null
      ? null
      : Array.isArray(value.lastRoll)
        ? ([value.lastRoll[0] ?? 1, value.lastRoll[1] ?? 1] as LudoDiceRoll)
        : ([value.lastRoll, value.lastRoll] as LudoDiceRoll);

  return {
    pieces,
    dice,
    playerOrder,
    lastRoll,
    mode,
    playerSeats,
  };
}
