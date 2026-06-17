import type { WhotCard, WhotShape } from "@/lib/social-games/game-state-types";

/** Official Whot deck composition (Sudoku Exchange / Pagat Nigerian rules). */
export const WHOT_SUIT_NUMBERS: Record<Exclude<WhotShape, "whot">, readonly number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};

export const WHOT_WILD_COUNT = 5;

export function whotStarScorePoints(playNumber: number): number {
  return playNumber * 2;
}

export function buildWhotDeck(): WhotCard[] {
  const cards: WhotCard[] = [];
  let id = 0;

  for (const [shape, numbers] of Object.entries(WHOT_SUIT_NUMBERS) as Array<
    [Exclude<WhotShape, "whot">, readonly number[]]
  >) {
    for (const number of numbers) {
      cards.push({
        id: `c${id++}`,
        number,
        shape,
        ...(shape === "star" ? { scorePoints: whotStarScorePoints(number) } : {}),
      });
    }
  }

  for (let i = 0; i < WHOT_WILD_COUNT; i++) {
    cards.push({ id: `w${i}`, number: 20, shape: "whot", scorePoints: 20 });
  }

  return cards;
}

export function isWhotSpecialNumber(number: number): boolean {
  return number === 1 || number === 2 || number === 5 || number === 8 || number === 14;
}
