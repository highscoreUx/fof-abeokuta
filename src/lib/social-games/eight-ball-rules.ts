import {
  createRackedEightBallBalls,
  eightBallKindForId,
  type EightBallBall,
  type EightBallGroup,
  type EightBallState,
} from "@/lib/social-games/eight-ball-types";
import type { EightBallShotResult } from "@/lib/social-games/eight-ball-physics";

export type EightBallShotRulesInput = EightBallShotResult & {
  calledPocketIndex?: number | null;
};

function opponentId(state: EightBallState, userId: string) {
  return state.playerOrder.find((id) => id !== userId) ?? null;
}

function groupForBallId(id: number): EightBallGroup | null {
  const kind = eightBallKindForId(id);
  if (kind === "solid") return "solids";
  if (kind === "stripe") return "stripes";
  return null;
}

function remainingForGroup(balls: EightBallBall[], group: EightBallGroup) {
  const kind = group === "solids" ? "solid" : "stripe";
  return balls.filter((ball) => !ball.pocketed && ball.kind === kind).length;
}

export interface EightBallTurnResult {
  state: EightBallState;
  winnerUserId: string | null;
  foul: boolean;
  keepTurn: boolean;
  message: string;
}

export function applyEightBallShotRules(
  state: EightBallState,
  userId: string,
  shot: EightBallShotRulesInput,
): EightBallTurnResult {
  const opponent = opponentId(state, userId);
  const balls = shot.balls;
  const assignments = { ...state.assignments };
  let tableOpen = state.tableOpen;
  let ballInHand = false;
  let isBreak = state.isBreak;
  let foul = false;
  let keepTurn = false;
  let winnerUserId: string | null = null;
  let message = "Nice shot.";

  const pocketedObject = shot.pocketedIds.filter((id) => id !== 0);
  const pocketedEight = shot.pocketedIds.includes(8);
  const myGroup = assignments[userId];

  if (shot.cueScratched) {
    foul = true;
    ballInHand = true;
    message = "Scratch — ball in hand for opponent.";
  }

  if (!foul && shot.firstContactId == null && pocketedObject.length === 0) {
    foul = true;
    ballInHand = true;
    message = "No ball hit — foul.";
  }

  if (!foul && !state.isBreak && shot.firstContactId != null && myGroup) {
    const firstKind = eightBallKindForId(shot.firstContactId);
    const requiredKind = myGroup === "solids" ? "solid" : "stripe";
    if (firstKind !== requiredKind && firstKind !== "eight") {
      foul = true;
      ballInHand = true;
      message = "Wrong ball first — foul.";
    }
  }

  if (pocketedEight) {
    const canShootEight =
      myGroup != null && remainingForGroup(balls, myGroup) === 0 && !foul;
    if (canShootEight) {
      const calledPocket = shot.calledPocketIndex;
      const actualPocket = shot.eightPocketIndex;
      const wrongPocket =
        calledPocket != null &&
        actualPocket != null &&
        calledPocket !== actualPocket;

      if (wrongPocket) {
        winnerUserId = opponent;
        message = "8 ball in the wrong pocket — you lose.";
      } else if (calledPocket == null && actualPocket != null) {
        winnerUserId = opponent;
        message = "8 ball sunk without calling a pocket — you lose.";
      } else {
        winnerUserId = userId;
        message = "8 ball pocketed — you win!";
      }
    } else {
      winnerUserId = opponent;
      message = foul ? "8 ball scratched — you lose." : "8 ball too early — you lose.";
    }
  }

  if (!winnerUserId && tableOpen && pocketedObject.length > 0 && !foul) {
    const firstPocket = pocketedObject[0]!;
    const group = groupForBallId(firstPocket);
    if (group && opponent) {
      assignments[userId] = group;
      assignments[opponent] = group === "solids" ? "stripes" : "solids";
      tableOpen = false;
      message = `You’re ${group}.`;
    }
  }

  if (!winnerUserId && !foul && pocketedObject.some((id) => groupForBallId(id) === myGroup)) {
    keepTurn = true;
  }

  if (!winnerUserId && isBreak && !foul) {
    isBreak = false;
    if (pocketedObject.length > 0) keepTurn = true;
  }

  if (!winnerUserId && isBreak && foul) {
    isBreak = false;
  }

  if (pocketedEight && winnerUserId === opponent && opponent == null) {
    winnerUserId = null;
  }

  return {
    state: {
      ...state,
      balls,
      assignments,
      tableOpen,
      ballInHand,
      isBreak,
      lastEvent: message,
    },
    winnerUserId,
    foul,
    keepTurn,
    message,
  };
}

export function applyEightBallCuePlacement(
  state: EightBallState,
  userId: string,
  x: number,
  y: number,
): { state: EightBallState; error?: string } {
  if (!state.ballInHand) return { state, error: "Ball in hand is not active." };

  const r = 0.042;
  const clampedX = Math.min(1.95, Math.max(0.05, x));
  const clampedY = Math.min(0.95, Math.max(0.05, y));

  for (const ball of state.balls) {
    if (ball.pocketed || ball.id === 0) continue;
    const dx = ball.x - clampedX;
    const dy = ball.y - clampedY;
    if (dx * dx + dy * dy < (r * 2.2) ** 2) {
      return { state, error: "Place the cue ball in open space." };
    }
  }

  const balls = state.balls.map((ball) =>
    ball.id === 0 ? { ...ball, x: clampedX, y: clampedY, pocketed: false } : ball,
  );

  return {
    state: {
      ...state,
      balls,
      ballInHand: false,
      lastEvent: `${userId === state.playerOrder[0] ? "Player" : "Opponent"} placed the cue ball.`,
    },
  };
}

export function rerackEightBall(state: EightBallState): EightBallState {
  return {
    ...state,
    balls: createRackedEightBallBalls(),
    tableOpen: true,
    ballInHand: false,
    isBreak: true,
    assignments: Object.fromEntries(state.playerOrder.map((id) => [id, null])),
    lastEvent: "Re-rack for break.",
  };
}
