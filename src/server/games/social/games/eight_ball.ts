import { createEightBallState, type EightBallSpin, type EightBallState } from "@/lib/social-games/eight-ball-types";
import { mustCallEightPocket } from "@/lib/social-games/eight-ball-aim-preview";
import { simulateEightBallShot } from "@/lib/social-games/eight-ball-physics";
import {
  applyEightBallCuePlacement,
  applyEightBallShotRules,
} from "@/lib/social-games/eight-ball-rules";

export type { EightBallState };

function parseSpin(payload: Record<string, unknown>): EightBallSpin | undefined {
  const raw = payload.spin;
  if (!raw || typeof raw !== "object") return undefined;
  const side = Number((raw as EightBallSpin).side);
  const follow = Number((raw as EightBallSpin).follow);
  if (!Number.isFinite(side) || !Number.isFinite(follow)) return undefined;
  return {
    side: Math.min(1, Math.max(-1, side)),
    follow: Math.min(1, Math.max(-1, follow)),
  };
}

export function createEightBallGameState(playerIds: string[]): EightBallState {
  return createEightBallState(playerIds);
}

export function applyEightBallMove(
  state: EightBallState,
  userId: string,
  action: string,
  payload: Record<string, unknown>,
): {
  state: EightBallState;
  winnerUserId: string | null;
  nextTurnUserId: string | null;
  error?: string;
} {
  if (action === "place_cue") {
    const x = Number(payload.x);
    const y = Number(payload.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { state, winnerUserId: null, nextTurnUserId: userId, error: "Invalid placement." };
    }
    const placed = applyEightBallCuePlacement(state, userId, x, y);
    if (placed.error) {
      return { state, winnerUserId: null, nextTurnUserId: userId, error: placed.error };
    }
    return {
      state: { ...placed.state, lastEvent: "Cue ball placed." },
      winnerUserId: null,
      nextTurnUserId: userId,
    };
  }

  if (action !== "shot") {
    return { state, winnerUserId: null, nextTurnUserId: userId, error: "Unknown action." };
  }

  if (state.ballInHand) {
    return {
      state,
      winnerUserId: null,
      nextTurnUserId: userId,
      error: "Place the cue ball before shooting.",
    };
  }

  const cue = state.balls.find((ball) => ball.id === 0);
  if (!cue || cue.pocketed) {
    return { state, winnerUserId: null, nextTurnUserId: userId, error: "Cue ball missing." };
  }

  const angle = Number(payload.angle);
  const power = Number(payload.power);
  if (!Number.isFinite(angle) || !Number.isFinite(power)) {
    return { state, winnerUserId: null, nextTurnUserId: userId, error: "Invalid shot." };
  }

  const spin = parseSpin(payload);
  const calledPocketRaw = payload.calledPocket;
  const calledPocketIndex =
    calledPocketRaw === undefined || calledPocketRaw === null
      ? null
      : Number(calledPocketRaw);

  if (mustCallEightPocket(state.balls, state.assignments, userId)) {
    if (
      calledPocketIndex == null ||
      !Number.isInteger(calledPocketIndex) ||
      calledPocketIndex < 0 ||
      calledPocketIndex > 5
    ) {
      return {
        state,
        winnerUserId: null,
        nextTurnUserId: userId,
        error: "Call a pocket before shooting the 8.",
      };
    }
  }

  const shot = simulateEightBallShot(state.balls, angle, power, spin);
  const shotWithCall = {
    ...shot,
    calledPocketIndex:
      calledPocketIndex != null && Number.isInteger(calledPocketIndex)
        ? calledPocketIndex
        : null,
  };
  const rules = applyEightBallShotRules(state, userId, shotWithCall);

  if (rules.winnerUserId) {
    return {
      state: rules.state,
      winnerUserId: rules.winnerUserId,
      nextTurnUserId: null,
    };
  }

  const opponent = state.playerOrder.find((id) => id !== userId) ?? userId;
  const nextTurnUserId = rules.foul || !rules.keepTurn ? opponent : userId;

  return {
    state: {
      ...rules.state,
      ballInHand: rules.foul ? true : rules.state.ballInHand,
      lastEvent: rules.message,
    },
    winnerUserId: null,
    nextTurnUserId,
  };
}
