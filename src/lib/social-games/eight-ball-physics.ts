import {
  EIGHT_BALL_BALL_RADIUS,
  EIGHT_BALL_POCKETS,
  EIGHT_BALL_TABLE_HEIGHT,
  EIGHT_BALL_TABLE_WIDTH,
  type EightBallBall,
  type EightBallSpin,
} from "@/lib/social-games/eight-ball-types";
import { pocketIndexForBall } from "@/lib/social-games/eight-ball-aim-preview";

const POCKET_RADIUS = 0.09;
const MAX_SPEED = 1.35;
const FRICTION = 0.988;
const REST_VELOCITY = 0.004;
const WALL_DAMP = 0.82;
const MAX_STEPS = 600;

export interface EightBallShotParams {
  angle: number;
  power: number;
  spin?: EightBallSpin;
}

interface SimBall {
  ball: EightBallBall;
  vx: number;
  vy: number;
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampSpin(value: number) {
  return Math.min(1, Math.max(-1, value));
}

function applySpinToCueVelocity(
  cue: SimBall,
  angle: number,
  spin: EightBallSpin | undefined,
  scale: number,
) {
  if (!spin) return;
  const side = clampSpin(spin.side);
  const follow = clampSpin(spin.follow);
  if (side === 0 && follow === 0) return;

  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const tanX = -dirY;
  const tanY = dirX;
  const speed = Math.hypot(cue.vx, cue.vy);

  cue.vx += tanX * side * speed * 0.42 * scale;
  cue.vy += tanY * side * speed * 0.42 * scale;
  cue.vx += dirX * (-follow) * speed * 0.22 * scale;
  cue.vy += dirY * (-follow) * speed * 0.22 * scale;
}

function resolveWallCollision(ball: SimBall, r: number, spin?: EightBallSpin) {
  const side = clampSpin(spin?.side ?? 0);
  let bounced = false;

  if (ball.ball.x < r) {
    ball.ball.x = r;
    ball.vx = Math.abs(ball.vx) * WALL_DAMP;
    bounced = true;
  }
  if (ball.ball.x > EIGHT_BALL_TABLE_WIDTH - r) {
    ball.ball.x = EIGHT_BALL_TABLE_WIDTH - r;
    ball.vx = -Math.abs(ball.vx) * WALL_DAMP;
    bounced = true;
  }
  if (ball.ball.y < r) {
    ball.ball.y = r;
    ball.vy = Math.abs(ball.vy) * WALL_DAMP;
    bounced = true;
  }
  if (ball.ball.y > EIGHT_BALL_TABLE_HEIGHT - r) {
    ball.ball.y = EIGHT_BALL_TABLE_HEIGHT - r;
    ball.vy = -Math.abs(ball.vy) * WALL_DAMP;
    bounced = true;
  }

  if (bounced && ball.ball.id === 0 && side !== 0) {
    const speed = Math.hypot(ball.vx, ball.vy);
    const angle = Math.atan2(ball.vy, ball.vx) + side * 0.12;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  }
}

function resolveBallCollision(
  a: SimBall,
  b: SimBall,
  r: number,
  shotAngle: number,
  spin?: EightBallSpin,
) {
  const dx = b.ball.x - a.ball.x;
  const dy = b.ball.y - a.ball.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = r * 2;
  if (dist === 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  a.ball.x -= (nx * overlap) / 2;
  a.ball.y -= (ny * overlap) / 2;
  b.ball.x += (nx * overlap) / 2;
  b.ball.y += (ny * overlap) / 2;

  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const impulse = dvx * nx + dvy * ny;
  if (impulse <= 0) return;

  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;

  if (a.ball.id === 0) {
    applySpinToCueVelocity(a, shotAngle, spin, 1);
  } else if (b.ball.id === 0) {
    applySpinToCueVelocity(b, shotAngle, spin, 1);
  }
}

function pocketBalls(simBalls: SimBall[], onEightPocketed?: (x: number, y: number) => void) {
  for (const sim of simBalls) {
    if (sim.ball.pocketed) continue;
    for (const pocket of EIGHT_BALL_POCKETS) {
      if (distance(sim.ball.x, sim.ball.y, pocket.x, pocket.y) <= POCKET_RADIUS) {
        if (sim.ball.id === 8) onEightPocketed?.(sim.ball.x, sim.ball.y);
        sim.ball.pocketed = true;
        sim.vx = 0;
        sim.vy = 0;
        break;
      }
    }
  }
}

export interface EightBallShotResult {
  balls: EightBallBall[];
  firstContactId: number | null;
  pocketedIds: number[];
  cueScratched: boolean;
  /** Pocket index (0–5) where the 8 was sunk, if pocketed this shot */
  eightPocketIndex: number | null;
}

export function simulateEightBallShot(
  balls: EightBallBall[],
  angle: number,
  power: number,
  spin?: EightBallSpin,
): EightBallShotResult {
  return runEightBallSimulation(balls, { angle, power, spin }).result;
}

export function simulateEightBallShotFrames(
  balls: EightBallBall[],
  angle: number,
  power: number,
  captureEvery = 2,
  spin?: EightBallSpin,
): { frames: EightBallBall[][]; result: EightBallShotResult } {
  return runEightBallSimulation(balls, { angle, power, spin }, captureEvery);
}

function runEightBallSimulation(
  balls: EightBallBall[],
  shot: EightBallShotParams,
  captureEvery = 0,
): { frames: EightBallBall[][]; result: EightBallShotResult } {
  const { angle, power, spin } = shot;
  const r = EIGHT_BALL_BALL_RADIUS;
  const simBalls: SimBall[] = balls.map((ball) => ({
    ball: { ...ball },
    vx: 0,
    vy: 0,
  }));

  const cue = simBalls.find((entry) => entry.ball.id === 0 && !entry.ball.pocketed);
  if (!cue) {
    return {
      frames: [],
      result: {
        balls,
        firstContactId: null,
        pocketedIds: [],
        cueScratched: false,
        eightPocketIndex: null,
      },
    };
  }

  const clampedPower = Math.min(1, Math.max(0.08, power));
  cue.vx = Math.cos(angle) * MAX_SPEED * clampedPower;
  cue.vy = Math.sin(angle) * MAX_SPEED * clampedPower;
  applySpinToCueVelocity(cue, angle, spin, 0.35);

  const pocketedBefore = new Set(
    simBalls.filter((entry) => entry.ball.pocketed).map((entry) => entry.ball.id),
  );
  let firstContactId: number | null = null;
  const frames: EightBallBall[][] = [];
  let eightPocketPosition: { x: number; y: number } | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    let moving = false;

    for (const sim of simBalls) {
      if (sim.ball.pocketed) continue;
      sim.ball.x += sim.vx;
      sim.ball.y += sim.vy;
      sim.vx *= FRICTION;
      sim.vy *= FRICTION;
      if (Math.abs(sim.vx) > REST_VELOCITY || Math.abs(sim.vy) > REST_VELOCITY) {
        moving = true;
      } else {
        sim.vx = 0;
        sim.vy = 0;
      }
      resolveWallCollision(sim, r, sim.ball.id === 0 ? spin : undefined);
    }

    const active = simBalls.filter((entry) => !entry.ball.pocketed);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]!;
        const b = active[j]!;
        const before = distance(a.ball.x, a.ball.y, b.ball.x, b.ball.y);
        resolveBallCollision(a, b, r, angle, spin);
        const after = distance(a.ball.x, a.ball.y, b.ball.x, b.ball.y);
        if (firstContactId == null && before >= r * 2 && after < r * 2) {
          if (a.ball.id === 0) firstContactId = b.ball.id;
          if (b.ball.id === 0) firstContactId = a.ball.id;
        }
      }
    }

    pocketBalls(simBalls, (x, y) => {
      eightPocketPosition = { x, y };
    });
    if (captureEvery > 0 && step % captureEvery === 0) {
      frames.push(simBalls.map((entry) => ({ ...entry.ball })));
    }
    if (!moving) break;
  }

  const resultBalls = simBalls.map((entry) => entry.ball);
  const pocketedIds = resultBalls
    .filter((ball) => ball.pocketed && !pocketedBefore.has(ball.id))
    .map((ball) => ball.id);
  const cueScratched = pocketedIds.includes(0);

  let eightPocketIndex: number | null = null;
  if (pocketedIds.includes(8) && eightPocketPosition) {
    eightPocketIndex = pocketIndexForBall(eightPocketPosition);
  }

  if (cueScratched) {
    const cueBall = resultBalls.find((ball) => ball.id === 0);
    if (cueBall) {
      cueBall.pocketed = false;
      cueBall.x = 0.35;
      cueBall.y = 0.5;
    }
  }

  return {
    frames,
    result: {
      balls: resultBalls,
      firstContactId,
      pocketedIds,
      cueScratched,
      eightPocketIndex,
    },
  };
}
