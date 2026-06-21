"use client";

import { useMemo } from "react";
import { computeEightBallGhostPreview } from "@/lib/social-games/eight-ball-aim-preview";
import {
  EIGHT_BALL_POCKETS,
  type EightBallBall,
} from "@/lib/social-games/eight-ball-types";
import {
  ballRadiusSvg,
  EIGHT_BALL_RAIL,
  EIGHT_BALL_VIEW_HEIGHT,
  EIGHT_BALL_VIEW_WIDTH,
  toTableSvg,
} from "@/lib/social-games/eight-ball-table-coords";

const SOLID_COLORS: Record<number, string> = {
  1: "#f5d547",
  2: "#2563eb",
  3: "#dc2626",
  4: "#9333ea",
  5: "#ea580c",
  6: "#16a34a",
  7: "#7f1d1d",
};

const STRIPE_COLORS: Record<number, string> = {
  9: "#f5d547",
  10: "#2563eb",
  11: "#dc2626",
  12: "#9333ea",
  13: "#ea580c",
  14: "#16a34a",
  15: "#7f1d1d",
};

function ballFill(id: number, kind: string) {
  if (id === 0) return "#f8fafc";
  if (kind === "eight") return "#111827";
  if (kind === "solid") return SOLID_COLORS[id] ?? "#64748b";
  return "#f8fafc";
}

export function EightBallTableSvg({
  balls,
  aimAngle,
  power,
  showCue,
  placingCue,
  ghostPreview,
  calledPocketIndex,
  pocketPickMode,
  onPocketPick,
}: {
  balls: EightBallBall[];
  aimAngle: number | null;
  power: number;
  showCue: boolean;
  placingCue?: { x: number; y: number } | null;
  ghostPreview?: ReturnType<typeof computeEightBallGhostPreview> | null;
  calledPocketIndex?: number | null;
  pocketPickMode?: boolean;
  onPocketPick?: (index: number) => void;
}) {
  const r = ballRadiusSvg();
  const innerX = EIGHT_BALL_RAIL;
  const innerY = EIGHT_BALL_RAIL;
  const innerW = EIGHT_BALL_VIEW_WIDTH - EIGHT_BALL_RAIL * 2;
  const innerH = EIGHT_BALL_VIEW_HEIGHT - EIGHT_BALL_RAIL * 2;

  const cueBall = balls.find((ball) => ball.id === 0 && !ball.pocketed);
  const cueSvg = cueBall ? toTableSvg(cueBall.x, cueBall.y) : null;

  const aimLine =
    showCue && cueSvg && aimAngle != null
      ? {
          x1: cueSvg.cx,
          y1: cueSvg.cy,
          x2: cueSvg.cx + Math.cos(aimAngle) * (90 + power * 110),
          y2: cueSvg.cy - Math.sin(aimAngle) * (90 + power * 110),
        }
      : null;

  const cueStick =
    showCue && cueSvg && aimAngle != null
      ? (() => {
          const stickAngle = aimAngle + Math.PI;
          const pullPx = 24 + power * 90;
          const tipX = cueSvg.cx + Math.cos(stickAngle) * (r + 4);
          const tipY = cueSvg.cy - Math.sin(stickAngle) * (r + 4);
          const buttX = cueSvg.cx + Math.cos(stickAngle) * (r + 4 + pullPx + 70);
          const buttY = cueSvg.cy - Math.sin(stickAngle) * (r + 4 + pullPx + 70);
          return { tipX, tipY, buttX, buttY };
        })()
      : null;

  const ghostSvg = useMemo(() => {
    if (!ghostPreview) return null;
    const ghost = toTableSvg(ghostPreview.ghostX, ghostPreview.ghostY);
    const object = toTableSvg(ghostPreview.objectX, ghostPreview.objectY);
    const pathLen = 70 + power * 40;
    return {
      ghost,
      object,
      objectEnd: {
        cx: object.cx + ghostPreview.objectDirX * pathLen,
        cy: object.cy - ghostPreview.objectDirY * pathLen,
      },
      cueEnd:
        cueSvg && ghostPreview.cutFactor < 0.95
          ? {
              cx: ghost.cx + ghostPreview.cueDirX * pathLen * 0.7,
              cy: ghost.cy - ghostPreview.cueDirY * pathLen * 0.7,
            }
          : null,
    };
  }, [ghostPreview, power, cueSvg]);

  return (
    <>
      <defs>
        <radialGradient id="eightBallFelt" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#1f7a45" />
          <stop offset="100%" stopColor="#14532d" />
        </radialGradient>
        <linearGradient id="eightBallRail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="50%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <radialGradient id="eightBallPocket" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#020617" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <filter id="eightBallShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width={EIGHT_BALL_VIEW_WIDTH} height={EIGHT_BALL_VIEW_HEIGHT} rx={16} fill="url(#eightBallRail)" />
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        rx={10}
        fill="url(#eightBallFelt)"
        stroke="#3f2d16"
        strokeWidth={2}
      />

      {EIGHT_BALL_POCKETS.map((pocket, index) => {
        const { cx, cy } = toTableSvg(pocket.x, pocket.y);
        const selected = calledPocketIndex === index;
        const pickable = pocketPickMode && onPocketPick;
        return (
          <g key={index}>
            <circle
              cx={cx}
              cy={cy}
              r={22}
              fill="url(#eightBallPocket)"
              className={pickable ? "cursor-pointer" : undefined}
              onClick={pickable ? () => onPocketPick(index) : undefined}
            />
            {pickable && (
              <circle
                cx={cx}
                cy={cy}
                r={28}
                fill="none"
                stroke={selected ? "#fde047" : "rgba(253,224,71,0.35)"}
                strokeWidth={selected ? 3 : 2}
                strokeDasharray={selected ? undefined : "4 3"}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}

      {ghostSvg && (
        <g pointerEvents="none">
          <circle
            cx={ghostSvg.ghost.cx}
            cy={ghostSvg.ghost.cy}
            r={r}
            fill="rgba(248,250,252,0.35)"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
          <line
            x1={ghostSvg.object.cx}
            y1={ghostSvg.object.cy}
            x2={ghostSvg.objectEnd.cx}
            y2={ghostSvg.objectEnd.cy}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          {ghostSvg.cueEnd && (
            <line
              x1={ghostSvg.ghost.cx}
              y1={ghostSvg.ghost.cy}
              x2={ghostSvg.cueEnd.cx}
              y2={ghostSvg.cueEnd.cy}
              stroke="rgba(147,197,253,0.5)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          )}
        </g>
      )}

      {aimLine && (
        <>
          <line
            x1={aimLine.x1}
            y1={aimLine.y1}
            x2={aimLine.x2}
            y2={aimLine.y2}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={2}
            strokeDasharray="6 5"
          />
          <circle cx={aimLine.x2} cy={aimLine.y2} r={4} fill="rgba(255,255,255,0.7)" />
        </>
      )}

      {cueStick && (
        <g pointerEvents="none">
          <line
            x1={cueStick.tipX}
            y1={cueStick.tipY}
            x2={cueStick.buttX}
            y2={cueStick.buttY}
            stroke="#fcd9a8"
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={cueStick.tipX}
            y1={cueStick.tipY}
            x2={cueStick.buttX}
            y2={cueStick.buttY}
            stroke="#92400e"
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      )}

      {balls
        .filter((ball) => !ball.pocketed)
        .map((ball) => {
          const { cx, cy } = toTableSvg(ball.x, ball.y);
          const fill = ballFill(ball.id, ball.kind);
          const isStripe = ball.kind === "stripe";
          const dimmed = ghostPreview?.objectBallId === ball.id;
          return (
            <g key={ball.id} filter="url(#eightBallShadow)" opacity={dimmed ? 0.85 : 1}>
              <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#1e293b" strokeWidth={1.2} />
              {isStripe && (
                <rect
                  x={cx - r * 0.78}
                  y={cy - r * 0.3}
                  width={r * 1.56}
                  height={r * 0.6}
                  fill={STRIPE_COLORS[ball.id] ?? "#64748b"}
                />
              )}
              {ball.id !== 0 && (
                <text
                  x={cx}
                  y={cy + r * 0.35}
                  textAnchor="middle"
                  fontSize={r * 0.95}
                  fontWeight="800"
                  fill={ball.kind === "eight" || ball.kind === "solid" ? "#fff" : "#111"}
                >
                  {ball.id}
                </text>
              )}
              <circle cx={cx - r * 0.28} cy={cy - r * 0.28} r={r * 0.22} fill="rgba(255,255,255,0.45)" />
            </g>
          );
        })}

      {placingCue && (
        <circle
          {...toTableSvg(placingCue.x, placingCue.y)}
          r={r}
          fill="rgba(248,250,252,0.55)"
          stroke="#fef08a"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
    </>
  );
}
