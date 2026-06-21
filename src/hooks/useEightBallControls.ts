"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeEightBallGhostPreview,
  mustCallEightPocket,
} from "@/lib/social-games/eight-ball-aim-preview";
import {
  aimTowardPoint,
  detectEightBallInputMode,
  EIGHT_BALL_MIN_POWER,
  powerFromPullback,
  pullToShot,
  type EightBallInputMode,
} from "@/lib/social-games/eight-ball-input";
import { simulateEightBallShotFrames } from "@/lib/social-games/eight-ball-physics";
import { fromTableSvg, toTableSvg } from "@/lib/social-games/eight-ball-table-coords";
import type { EightBallBall, EightBallSpin, EightBallState } from "@/lib/social-games/eight-ball-types";
import { EIGHT_BALL_POCKETS } from "@/lib/social-games/eight-ball-types";

export interface EightBallShotPayload {
  angle: number;
  power: number;
  spin: EightBallSpin;
  calledPocket?: number;
}

type ControlPhase = "idle" | "charging" | "placing" | "animating";

const ZERO_SPIN: EightBallSpin = { side: 0, follow: 0 };

function defaultAimAngle(state: EightBallState) {
  const cue = state.balls.find((ball) => ball.id === 0 && !ball.pocketed);
  if (!cue) return 0;
  const target = state.balls.find((ball) => ball.id === 8 && !ball.pocketed);
  if (target) return aimTowardPoint(cue.x, cue.y, target.x, target.y);
  return 0;
}

function pocketIndexAtTablePoint(x: number, y: number) {
  for (let i = 0; i < EIGHT_BALL_POCKETS.length; i++) {
    const pocket = EIGHT_BALL_POCKETS[i]!;
    if (Math.hypot(x - pocket.x, y - pocket.y) < 0.12) return i;
  }
  return null;
}

function pointerFromEvent(svg: SVGSVGElement, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect();
  const scaleX = svg.viewBox.baseVal.width / rect.width;
  const scaleY = svg.viewBox.baseVal.height / rect.height;
  return {
    cx: (clientX - rect.left) * scaleX,
    cy: (clientY - rect.top) * scaleY,
  };
}

export function useEightBallControls({
  game,
  enabled,
  ballInHand,
  turnUserId,
  userId,
  onShoot,
  onPlaceCue,
}: {
  game: EightBallState;
  enabled: boolean;
  ballInHand: boolean;
  turnUserId: string | null;
  userId: string | null;
  onShoot: (payload: EightBallShotPayload) => void;
  onPlaceCue: (x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const phaseRef = useRef<ControlPhase>("idle");
  const gameRef = useRef(game);
  const [inputMode, setInputMode] = useState<EightBallInputMode>(() =>
    typeof window === "undefined" ? "mouse" : detectEightBallInputMode(),
  );
  const [aimAngle, setAimAngle] = useState(() => defaultAimAngle(game));
  const [power, setPower] = useState(0);
  const [spin, setSpin] = useState<EightBallSpin>(ZERO_SPIN);
  const [calledPocketIndex, setCalledPocketIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<ControlPhase>("idle");
  const [displayBalls, setDisplayBalls] = useState<EightBallBall[] | null>(null);
  const [placingPreview, setPlacingPreview] = useState<{ x: number; y: number } | null>(null);

  const chargingRef = useRef(false);
  const dragStartRef = useRef<{ cx: number; cy: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const setPhaseSafe = useCallback((next: ControlPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const hover = window.matchMedia("(hover: none)");
    const sync = () => setInputMode(detectEightBallInputMode());
    coarse.addEventListener("change", sync);
    hover.addEventListener("change", sync);
    return () => {
      coarse.removeEventListener("change", sync);
      hover.removeEventListener("change", sync);
    };
  }, []);

  const needsCallPocket = Boolean(
    userId && mustCallEightPocket(game.balls, game.assignments, userId),
  );

  useEffect(() => {
    if (phaseRef.current === "animating") return;
    setDisplayBalls(null);
    setAimAngle(defaultAimAngle(gameRef.current));
    setPower(0);
    setSpin(ZERO_SPIN);
    setCalledPocketIndex(null);
    setPhaseSafe(ballInHand ? "placing" : "idle");
    setPlacingPreview(null);
    chargingRef.current = false;
    dragStartRef.current = null;
  }, [turnUserId, ballInHand, enabled, setPhaseSafe]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const cueBall = game.balls.find((ball) => ball.id === 0 && !ball.pocketed);
  const ballsToRender = displayBalls ?? game.balls;
  const canInteract = enabled && phase !== "animating";

  const ghostPreview = useMemo(() => {
    if (!cueBall || ballInHand || aimAngle == null || !canInteract) return null;
    return computeEightBallGhostPreview(ballsToRender, cueBall.x, cueBall.y, aimAngle);
  }, [aimAngle, ballInHand, ballsToRender, canInteract, cueBall]);

  const playShotAnimation = useCallback(
    (angle: number, shotPower: number, shotSpin: EightBallSpin) => {
      const { frames } = simulateEightBallShotFrames(
        gameRef.current.balls,
        angle,
        shotPower,
        3,
        shotSpin,
      );
      if (frames.length === 0) {
        setPhaseSafe("idle");
        setPower(0);
        return;
      }

      setPhaseSafe("animating");
      let index = 0;
      let lastFrame = 0;

      const step = (timestamp: number) => {
        if (index >= frames.length) {
          setDisplayBalls(null);
          setAimAngle(defaultAimAngle(gameRef.current));
          setPhaseSafe("idle");
          setPower(0);
          animFrameRef.current = null;
          return;
        }

        if (timestamp - lastFrame >= 28) {
          setDisplayBalls(frames[index]!);
          index += 1;
          lastFrame = timestamp;
        }

        animFrameRef.current = requestAnimationFrame(step);
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [setPhaseSafe],
  );

  const commitShot = useCallback(
    (angle: number, shotPower: number, shotSpin: EightBallSpin) => {
      if (!cueBall || shotPower < EIGHT_BALL_MIN_POWER) return;
      if (needsCallPocket && calledPocketIndex == null) return;

      playShotAnimation(angle, shotPower, shotSpin);
      onShoot({
        angle,
        power: shotPower,
        spin: shotSpin,
        ...(calledPocketIndex != null ? { calledPocket: calledPocketIndex } : {}),
      });
    },
    [calledPocketIndex, cueBall, needsCallPocket, onShoot, playShotAnimation],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!canInteract) return;
      const svg = svgRef.current;
      if (!svg) return;
      event.preventDefault();
      svg.setPointerCapture(event.pointerId);

      const { cx, cy } = pointerFromEvent(svg, event.clientX, event.clientY);
      const tablePoint = fromTableSvg(cx, cy);

      if (needsCallPocket && !ballInHand) {
        const pocketIndex = pocketIndexAtTablePoint(tablePoint.x, tablePoint.y);
        if (pocketIndex != null) {
          setCalledPocketIndex(pocketIndex);
          return;
        }
      }

      if (ballInHand) {
        setPhaseSafe("placing");
        setPlacingPreview(fromTableSvg(cx, cy));
        return;
      }

      if (!cueBall) return;

      const cue = toTableSvg(cueBall.x, cueBall.y);

      if (inputMode === "touch") {
        dragStartRef.current = { cx: cue.cx, cy: cue.cy };
        chargingRef.current = true;
        setPhaseSafe("charging");
        setPower(0);
        return;
      }

      chargingRef.current = true;
      setPhaseSafe("charging");
      setAimAngle(aimTowardPoint(cue.cx, cue.cy, cx, cy));
      setPower(0);
    },
    [ballInHand, canInteract, cueBall, inputMode, needsCallPocket, setPhaseSafe],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!canInteract) return;
      const svg = svgRef.current;
      if (!svg) return;

      const { cx, cy } = pointerFromEvent(svg, event.clientX, event.clientY);

      if (ballInHand && phase === "placing") {
        setPlacingPreview(fromTableSvg(cx, cy));
        return;
      }

      if (!cueBall) return;
      const cue = toTableSvg(cueBall.x, cueBall.y);

      if (!chargingRef.current) {
        if (inputMode === "mouse" && !ballInHand && phase === "idle") {
          setAimAngle(aimTowardPoint(cue.cx, cue.cy, cx, cy));
        }
        return;
      }

      if (inputMode === "touch" && dragStartRef.current) {
        const pullDx = cx - dragStartRef.current.cx;
        const pullDy = cy - dragStartRef.current.cy;
        const shot = pullToShot(pullDx, pullDy);
        if (shot) {
          setAimAngle(shot.angle);
          setPower(shot.power);
        }
        return;
      }

      if (inputMode === "mouse") {
        const angle = aimTowardPoint(cue.cx, cue.cy, cx, cy);
        setAimAngle(angle);
        setPower(powerFromPullback(cue.cx, cue.cy, cx, cy, angle));
      }
    },
    [ballInHand, canInteract, cueBall, inputMode, phase],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      if (svg.hasPointerCapture(event.pointerId)) {
        svg.releasePointerCapture(event.pointerId);
      }

      if (ballInHand && placingPreview && phase === "placing") {
        onPlaceCue(placingPreview.x, placingPreview.y);
        setPlacingPreview(null);
        setPhaseSafe("idle");
        return;
      }

      if (chargingRef.current && cueBall) {
        const shotPower = power;
        const angle = aimAngle;
        const shotSpin = spin;
        chargingRef.current = false;
        dragStartRef.current = null;
        if (shotPower >= EIGHT_BALL_MIN_POWER) {
          commitShot(angle, shotPower, shotSpin);
        } else {
          setPhaseSafe("idle");
          setPower(0);
        }
      }
    },
    [
      aimAngle,
      ballInHand,
      commitShot,
      cueBall,
      onPlaceCue,
      phase,
      placingPreview,
      power,
      setPhaseSafe,
      spin,
    ],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      if (!canInteract || inputMode !== "mouse" || ballInHand || !cueBall) return;
      event.preventDefault();
      setAimAngle((angle) => angle + (event.deltaY > 0 ? -0.02 : 0.02));
    },
    [ballInHand, canInteract, cueBall, inputMode],
  );

  const hint = needsCallPocket
    ? calledPocketIndex == null
      ? "Tap a pocket to call your 8-ball shot"
      : inputMode === "touch"
        ? "Pull back and release to shoot the 8"
        : "Aim and pull back to shoot the 8"
    : inputMode === "touch"
      ? ballInHand
        ? "Drag to place the cue ball"
        : "Pull back from the cue ball and release to shoot"
      : ballInHand
        ? "Click or drag to place the cue ball"
        : "Aim with the mouse, pull back to shoot · scroll to fine-tune";

  return {
    svgRef,
    inputMode,
    aimAngle: ballInHand ? null : aimAngle,
    power,
    spin,
    setSpin,
    calledPocketIndex,
    setCalledPocketIndex,
    needsCallPocket,
    ghostPreview,
    phase,
    ballsToRender,
    placingPreview,
    showCue: canInteract && !ballInHand && Boolean(cueBall),
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: onPointerUp,
    onWheel,
    hint,
  };
}
