export type EightBallGroup = "solids" | "stripes";

export type EightBallBallKind = "cue" | "solid" | "stripe" | "eight";

/** Lateral english (-1 left, +1 right) and follow/draw (-1 follow, +1 draw). */
export interface EightBallSpin {
  side: number;
  follow: number;
}

export interface EightBallBall {
  id: number;
  x: number;
  y: number;
  pocketed: boolean;
  kind: EightBallBallKind;
}

export interface EightBallState {
  balls: EightBallBall[];
  playerOrder: string[];
  /** null = open table */
  assignments: Record<string, EightBallGroup | null>;
  tableOpen: boolean;
  ballInHand: boolean;
  isBreak: boolean;
  lastEvent?: string;
}

export const EIGHT_BALL_TABLE_WIDTH = 2;
export const EIGHT_BALL_TABLE_HEIGHT = 1;
export const EIGHT_BALL_BALL_RADIUS = 0.042;

export const EIGHT_BALL_POCKETS: Array<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
];

export function eightBallKindForId(id: number): EightBallBallKind {
  if (id === 0) return "cue";
  if (id === 8) return "eight";
  if (id >= 1 && id <= 7) return "solid";
  return "stripe";
}

export function createRackedEightBallBalls(): EightBallBall[] {
  const r = EIGHT_BALL_BALL_RADIUS;
  const rackX = 1.55;
  const rackY = 0.5;
  const spacing = r * 2.05;

  const rackPositions: Array<{ id: number; dx: number; dy: number }> = [
    { id: 1, dx: 0, dy: 0 },
    { id: 9, dx: spacing, dy: -spacing * 0.52 },
    { id: 2, dx: spacing, dy: spacing * 0.52 },
    { id: 10, dx: spacing * 2, dy: -spacing },
    { id: 8, dx: spacing * 2, dy: 0 },
    { id: 3, dx: spacing * 2, dy: spacing },
    { id: 11, dx: spacing * 3, dy: -spacing * 1.5 },
    { id: 4, dx: spacing * 3, dy: -spacing * 0.5 },
    { id: 12, dx: spacing * 3, dy: spacing * 0.5 },
    { id: 5, dx: spacing * 3, dy: spacing * 1.5 },
    { id: 13, dx: spacing * 4, dy: -spacing * 2 },
    { id: 6, dx: spacing * 4, dy: -spacing },
    { id: 14, dx: spacing * 4, dy: 0 },
    { id: 7, dx: spacing * 4, dy: spacing },
    { id: 15, dx: spacing * 4, dy: spacing * 2 },
  ];

  const balls: EightBallBall[] = rackPositions.map(({ id, dx, dy }) => ({
    id,
    x: rackX + dx,
    y: rackY + dy,
    pocketed: false,
    kind: eightBallKindForId(id),
  }));

  balls.unshift({
    id: 0,
    x: 0.35,
    y: 0.5,
    pocketed: false,
    kind: "cue",
  });

  return balls;
}

export function createEightBallState(playerIds: string[]): EightBallState {
  const assignments: Record<string, EightBallGroup | null> = {};
  for (const id of playerIds) assignments[id] = null;

  return {
    balls: createRackedEightBallBalls(),
    playerOrder: [...playerIds],
    assignments,
    tableOpen: true,
    ballInHand: false,
    isBreak: true,
    lastEvent: "Break to start.",
  };
}
