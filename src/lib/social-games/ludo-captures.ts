import type { LudoPiece, LudoState } from "@/lib/social-games/game-state-types";
import {
  LUDO_HOME,
  LUDO_HOME_STRETCH,
  LUDO_PATH,
  LUDO_TRACK_LEN,
  ludoCellKind,
  ludoFinishLine,
  ludoPathStartSeat,
  ludoPieceCoords,
  ludoStartSquare,
} from "@/lib/social-games/ludo-board-layout";

function isActiveOnBoard(piece: LudoPiece): boolean {
  if (piece.position == null || piece.position < 0) return false;
  const start = ludoStartSquare(piece.homeSeat);
  const rel = piece.position - start;
  return rel >= 0 && rel < LUDO_TRACK_LEN;
}

/** Shared outer-ring cell index (0–51) for a token on the main track. */
export function ludoOuterPathKey(homeSeat: number, position: number): number | null {
  if (position < 0) return null;
  const start = ludoStartSquare(homeSeat);
  const rel = position - start;
  if (rel < 0 || rel >= LUDO_TRACK_LEN - LUDO_HOME_STRETCH) return null;
  return (start + rel) % LUDO_PATH.length;
}

export function ludoIsInHomeColumn(piece: LudoPiece): boolean {
  if (!isActiveOnBoard(piece)) return false;
  const start = ludoStartSquare(piece.homeSeat);
  const rel = piece.position - start;
  return rel >= LUDO_TRACK_LEN - LUDO_HOME_STRETCH && rel < LUDO_TRACK_LEN;
}

/** Star-marked cells on the outer track — stationary pieces here cannot be captured. */
export function ludoIsStarSafeSquare(row: number, col: number): boolean {
  return ludoCellKind(row, col) === "safe";
}

/** Squares where two of your own tokens may share a cell (stars + colored starts). */
export function ludoIsStackSafeSquare(row: number, col: number): boolean {
  return ludoIsStarSafeSquare(row, col) || ludoPathStartSeat(row, col) != null;
}

export function ludoIsPieceOnStarSquare(piece: LudoPiece): boolean {
  if (!isActiveOnBoard(piece) || ludoIsInHomeColumn(piece)) return false;
  const { row, col } = ludoPieceCoords(piece.homeSeat, piece.position, 0);
  return ludoIsStarSafeSquare(row, col);
}

/**
 * Classic Ludo: landing on an opponent on the outer track sends them home.
 * The capturing seed completes its journey and leaves the board (same as finishing).
 * Only star cells protect stationary pieces; colored start squares do not.
 */
export function ludoCanCaptureVictim(
  victim: LudoPiece,
  victimUserId: string,
  moverUserId: string,
  landingKey: number,
): boolean {
  if (victimUserId === moverUserId) return false;
  if (!isActiveOnBoard(victim)) return false;
  if (ludoIsInHomeColumn(victim)) return false;

  const victimKey = ludoOuterPathKey(victim.homeSeat, victim.position);
  if (victimKey == null || victimKey !== landingKey) return false;

  if (ludoIsPieceOnStarSquare(victim)) return false;
  return true;
}

/** Cannot end a move on top of your own token except on stack-safe squares. */
export function ludoCanLandAt(
  state: LudoState,
  userId: string,
  mover: LudoPiece,
  nextPos: number,
): boolean {
  if (nextPos > ludoFinishLine(mover.homeSeat)) return false;

  const landingKey = ludoOuterPathKey(mover.homeSeat, nextPos);
  if (landingKey == null) {
    return true;
  }

  for (const [ownerId, pieces] of Object.entries(state.pieces)) {
    for (const other of pieces) {
      if (ownerId === userId && other.id === mover.id) continue;

      const otherKey = ludoOuterPathKey(other.homeSeat, other.position);
      if (otherKey !== landingKey) continue;

      if (ownerId === userId) {
        const { row, col } = ludoPieceCoords(other.homeSeat, other.position, 0);
        if (!ludoIsStackSafeSquare(row, col)) return false;
      }
    }
  }

  return true;
}

export function applyLudoCaptures(
  allPieces: Record<string, LudoPiece[]>,
  moverUserId: string,
  movedHomeSeat: number,
  nextPos: number,
): { pieces: Record<string, LudoPiece[]>; captured: number } {
  const landingKey = ludoOuterPathKey(movedHomeSeat, nextPos);
  if (landingKey == null) {
    return { pieces: allPieces, captured: 0 };
  }

  let captured = 0;
  const nextPieces: Record<string, LudoPiece[]> = { ...allPieces };

  for (const [victimUserId, pieces] of Object.entries(allPieces)) {
    let changed = false;
    const updated = pieces.map((victim) => {
      if (
        !ludoCanCaptureVictim(victim, victimUserId, moverUserId, landingKey)
      ) {
        return victim;
      }
      captured += 1;
      changed = true;
      return { ...victim, position: LUDO_HOME };
    });
    if (changed) nextPieces[victimUserId] = updated;
  }

  return { pieces: nextPieces, captured };
}
