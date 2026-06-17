import type { LudoDieChoice, LudoDiceRoll, LudoPiece, LudoState } from "@/lib/social-games/game-state-types";
import { ludoCanLandAt } from "@/lib/social-games/ludo-captures";

const TRACK_LEN = 52;

function ludoStartSquare(homeSeat: number): number {
  return homeSeat * 13;
}

function ludoFinishLine(homeSeat: number): number {
  return ludoStartSquare(homeSeat) + TRACK_LEN;
}

export function ludoDiceUsed(state: LudoState): [boolean, boolean] {
  return state.diceUsed ?? [false, false];
}

export function ludoRemainingDice(
  state: LudoState,
): Array<{ index: 0 | 1; value: number }> {
  if (!state.dice) return [];
  const used = ludoDiceUsed(state);
  const remaining: Array<{ index: 0 | 1; value: number }> = [];
  if (!used[0]) remaining.push({ index: 0, value: state.dice[0] });
  if (!used[1]) remaining.push({ index: 1, value: state.dice[1] });
  return remaining;
}

export function ludoAllDiceUsed(state: LudoState): boolean {
  const used = ludoDiceUsed(state);
  return used[0] && used[1];
}

export function ludoCanUseSum(state: LudoState): boolean {
  const used = ludoDiceUsed(state);
  return state.dice != null && !used[0] && !used[1];
}

export function ludoStepsForChoice(state: LudoState, choice: LudoDieChoice): number | null {
  if (!state.dice) return null;
  const used = ludoDiceUsed(state);
  if (choice === "sum") {
    if (used[0] || used[1]) return null;
    return state.dice[0] + state.dice[1];
  }
  if (used[choice]) return null;
  return state.dice[choice];
}

export function ludoIsPieceOnTrack(piece: LudoPiece): boolean {
  if (piece.position == null || piece.position < 0) return false;
  const start = ludoStartSquare(piece.homeSeat);
  const finish = ludoFinishLine(piece.homeSeat);
  return piece.position >= start && piece.position <= finish;
}

export function ludoIsPieceAtHome(piece: LudoPiece): boolean {
  return !ludoIsPieceOnTrack(piece);
}

/** Enter yard only with a single die showing 6; track moves use die pips or both-dice sum. */
export function ludoCanMovePieceWithSteps(
  state: LudoState,
  userId: string,
  piece: LudoPiece,
  steps: number,
): boolean {
  if (!ludoIsPieceOnTrack(piece)) {
    return steps === 6;
  }
  const nextPos = piece.position + steps;
  if (nextPos > ludoFinishLine(piece.homeSeat)) return false;
  return ludoCanLandAt(state, userId, piece, nextPos);
}

export function ludoLegalChoicesForPiece(
  state: LudoState,
  userId: string,
  piece: LudoPiece,
): LudoDieChoice[] {
  if (!state.dice) return [];

  const choices: LudoDieChoice[] = [];
  const onTrack = ludoIsPieceOnTrack(piece);

  for (const { index, value } of ludoRemainingDice(state)) {
    if (ludoCanMovePieceWithSteps(state, userId, piece, value)) {
      choices.push(index);
    }
  }

  if (onTrack && ludoCanUseSum(state)) {
    const sum = state.dice[0] + state.dice[1];
    if (ludoCanMovePieceWithSteps(state, userId, piece, sum)) {
      choices.push("sum");
    }
  }

  return choices;
}

export function ludoPieceHasLegalMove(
  state: LudoState,
  userId: string,
  piece: LudoPiece,
): boolean {
  return ludoLegalChoicesForPiece(state, userId, piece).length > 0;
}

export function ludoHasLegalMove(state: LudoState, userId: string): boolean {
  if (!state.dice) return false;
  const ownedSeats = state.playerSeats[userId];
  if (!ownedSeats?.length) return false;
  const pieces = state.pieces[userId] ?? [];
  return pieces.some(
    (piece) =>
      ownedSeats.includes(piece.homeSeat) && ludoPieceHasLegalMove(state, userId, piece),
  );
}

export function ludoMarkDiceUsed(
  used: [boolean, boolean],
  choice: LudoDieChoice,
): [boolean, boolean] {
  if (choice === "sum") return [true, true];
  const next: [boolean, boolean] = [used[0], used[1]];
  next[choice] = true;
  return next;
}

export function ludoDieChoiceLabel(state: LudoState, choice: LudoDieChoice): string {
  if (!state.dice) return "";
  if (choice === "sum") return `Both (${state.dice[0] + state.dice[1]})`;
  return String(state.dice[choice]);
}

export function ludoHasSixOnRemainingDice(state: LudoState): boolean {
  return ludoRemainingDice(state).some((entry) => entry.value === 6);
}

export function ludoDiceSum(dice: LudoDiceRoll): number {
  return dice[0] + dice[1];
}

export function ludoHasSix(dice: LudoDiceRoll): boolean {
  return dice[0] === 6 || dice[1] === 6;
}

export function ludoIsDoubles(dice: LudoDiceRoll): boolean {
  return dice[0] === dice[1];
}

export function ludoEnterPosition(homeSeat: number): number {
  return ludoStartSquare(homeSeat);
}

export function ludoFinishPosition(homeSeat: number): number {
  return ludoFinishLine(homeSeat);
}
