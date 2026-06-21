import {
  EIGHT_BALL_BALL_RADIUS,
  EIGHT_BALL_POCKETS,
  EIGHT_BALL_TABLE_HEIGHT,
  EIGHT_BALL_TABLE_WIDTH,
  type EightBallBall,
} from "@/lib/social-games/eight-ball-types";

const R = EIGHT_BALL_BALL_RADIUS;
const DIAMETER = R * 2;

export interface EightBallGhostPreview {
  objectBallId: number;
  ghostX: number;
  ghostY: number;
  objectX: number;
  objectY: number;
  /** Unit vector — object ball path after contact */
  objectDirX: number;
  objectDirY: number;
  /** Unit vector — cue ball deflection (simplified) */
  cueDirX: number;
  cueDirY: number;
  cutFactor: number;
}

function dot(ax: number, ay: number, bx: number, by: number) {
  return ax * bx + ay * by;
}

function norm(dx: number, dy: number) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

export function computeEightBallGhostPreview(
  balls: EightBallBall[],
  cueX: number,
  cueY: number,
  angle: number,
): EightBallGhostPreview | null {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  let bestT = Infinity;
  let hitBall: EightBallBall | null = null;

  for (const ball of balls) {
    if (ball.pocketed || ball.id === 0) continue;

    const ox = ball.x - cueX;
    const oy = ball.y - cueY;
    const along = dot(ox, oy, dirX, dirY);
    if (along <= R * 0.5) continue;

    const perpX = ox - dirX * along;
    const perpY = oy - dirY * along;
    const perpDist = Math.hypot(perpX, perpY);
    if (perpDist > DIAMETER * 0.98) continue;

    const offset = Math.sqrt(Math.max(0, DIAMETER * DIAMETER - perpDist * perpDist));
    const contactT = along - offset;
    if (contactT < 0 || contactT >= bestT) continue;

    bestT = contactT;
    hitBall = ball;
  }

  if (!hitBall || !Number.isFinite(bestT)) return null;

  const ghostX = cueX + dirX * bestT;
  const ghostY = cueY + dirY * bestT;
  const toObject = norm(hitBall.x - ghostX, hitBall.y - ghostY);
  const cutFactor = Math.hypot(hitBall.x - ghostX, hitBall.y - ghostY) / DIAMETER;

  const cueDir = norm(dirX - toObject.x * dot(dirX, dirY, toObject.x, toObject.y), dirY - toObject.y * dot(dirX, dirY, toObject.x, toObject.y));

  return {
    objectBallId: hitBall.id,
    ghostX,
    ghostY,
    objectX: hitBall.x,
    objectY: hitBall.y,
    objectDirX: toObject.x,
    objectDirY: toObject.y,
    cueDirX: cueDir.x,
    cueDirY: cueDir.y,
    cutFactor: Math.min(1, cutFactor),
  };
}

export function pocketIndexForBall(ball: { x: number; y: number }): number | null {
  let best = Infinity;
  let index: number | null = null;
  for (let i = 0; i < EIGHT_BALL_POCKETS.length; i++) {
    const pocket = EIGHT_BALL_POCKETS[i]!;
    const dist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
    if (dist < best) {
      best = dist;
      index = i;
    }
  }
  return index;
}

export function remainingGroupBalls(balls: EightBallBall[], group: "solids" | "stripes") {
  const kind = group === "solids" ? "solid" : "stripe";
  return balls.filter((ball) => !ball.pocketed && ball.kind === kind).length;
}

export function mustCallEightPocket(
  balls: EightBallBall[],
  assignments: Record<string, "solids" | "stripes" | null>,
  userId: string,
): boolean {
  const group = assignments[userId];
  if (!group) return false;
  const eightOnTable = balls.some((ball) => ball.id === 8 && !ball.pocketed);
  return eightOnTable && remainingGroupBalls(balls, group) === 0;
}

export function isPointInTable(x: number, y: number) {
  return x >= R && x <= EIGHT_BALL_TABLE_WIDTH - R && y >= R && y <= EIGHT_BALL_TABLE_HEIGHT - R;
}
