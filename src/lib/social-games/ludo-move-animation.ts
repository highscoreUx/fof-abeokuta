import { LUDO_HOME, ludoPieceCoords } from "@/lib/social-games/ludo-board-layout";

/** Board cells visited when a seed moves (one frame per step). */
export function ludoMoveAnimationFrames(
  homeSeat: number,
  fromPosition: number,
  toPosition: number,
  yardIndex: number,
): Array<{ row: number; col: number }> {
  if (toPosition < 0) return [];

  if (fromPosition === LUDO_HOME || fromPosition < 0) {
    const frames: Array<{ row: number; col: number }> = [
      ludoPieceCoords(homeSeat, LUDO_HOME, yardIndex),
    ];
    for (let position = 0; position <= toPosition; position += 1) {
      frames.push(ludoPieceCoords(homeSeat, position, yardIndex));
    }
    return frames;
  }

  const frames: Array<{ row: number; col: number }> = [];
  for (let position = fromPosition + 1; position <= toPosition; position += 1) {
    frames.push(ludoPieceCoords(homeSeat, position, yardIndex));
  }
  return frames;
}

export const LUDO_ANIMATION_STEP_MS = 140;
