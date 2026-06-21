import {
  EIGHT_BALL_BALL_RADIUS,
  EIGHT_BALL_TABLE_HEIGHT,
  EIGHT_BALL_TABLE_WIDTH,
} from "@/lib/social-games/eight-ball-types";

export const EIGHT_BALL_VIEW_WIDTH = 800;
export const EIGHT_BALL_VIEW_HEIGHT = 400;
export const EIGHT_BALL_RAIL = 28;

export function toTableSvg(x: number, y: number) {
  const innerW = EIGHT_BALL_VIEW_WIDTH - EIGHT_BALL_RAIL * 2;
  const innerH = EIGHT_BALL_VIEW_HEIGHT - EIGHT_BALL_RAIL * 2;
  return {
    cx: EIGHT_BALL_RAIL + (x / EIGHT_BALL_TABLE_WIDTH) * innerW,
    cy: EIGHT_BALL_RAIL + (1 - y / EIGHT_BALL_TABLE_HEIGHT) * innerH,
  };
}

export function fromTableSvg(cx: number, cy: number) {
  const innerW = EIGHT_BALL_VIEW_WIDTH - EIGHT_BALL_RAIL * 2;
  const innerH = EIGHT_BALL_VIEW_HEIGHT - EIGHT_BALL_RAIL * 2;
  return {
    x: ((cx - EIGHT_BALL_RAIL) / innerW) * EIGHT_BALL_TABLE_WIDTH,
    y: (1 - (cy - EIGHT_BALL_RAIL) / innerH) * EIGHT_BALL_TABLE_HEIGHT,
  };
}

export function ballRadiusSvg() {
  const innerW = EIGHT_BALL_VIEW_WIDTH - EIGHT_BALL_RAIL * 2;
  return (EIGHT_BALL_BALL_RADIUS / EIGHT_BALL_TABLE_WIDTH) * innerW;
}
