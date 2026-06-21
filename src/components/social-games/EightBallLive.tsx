"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEightBallControls, type EightBallShotPayload } from "@/hooks/useEightBallControls";
import { Card, CardTitle } from "@/components/ui/card";
import { EightBallSpinPad } from "@/components/social-games/EightBallSpinPad";
import { EightBallTableSvg } from "@/components/social-games/EightBallTable";
import {
  EIGHT_BALL_VIEW_HEIGHT,
  EIGHT_BALL_VIEW_WIDTH,
} from "@/lib/social-games/eight-ball-table-coords";
import type { EightBallState } from "@/lib/social-games/game-state-types";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";

function playerName(snapshot: SocialGameMatchSnapshot, userId: string | null | undefined) {
  if (!userId) return "Player";
  const player = snapshot.players.find((entry) => entry.userId === userId);
  return player?.firstName ?? "Player";
}

function PowerMeter({ power, vertical }: { power: number; vertical: boolean }) {
  const pct = Math.round(power * 100);
  if (vertical) {
    return (
      <div className="pointer-events-none absolute right-3 top-1/2 z-10 flex h-40 -translate-y-1/2 flex-col items-center gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-100/80">Power</span>
        <div className="relative h-32 w-3 overflow-hidden rounded-full border border-amber-900/50 bg-emerald-950/80">
          <div
            className="absolute bottom-0 w-full rounded-full bg-gradient-to-t from-amber-600 to-yellow-300 transition-[height] duration-75"
            style={{ height: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-amber-100">{pct}%</span>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-3 z-10">
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-amber-100/80">
        <span>Power</span>
        <span>{pct}%</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full border border-amber-900/50 bg-emerald-950/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-yellow-300 transition-[width] duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EightBallInteractiveTable({
  game,
  enabled,
  turnUserId,
  userId,
  onShoot,
  onPlaceCue,
}: {
  game: EightBallState;
  enabled: boolean;
  turnUserId: string | null;
  userId: string | null;
  onShoot: (payload: EightBallShotPayload) => void;
  onPlaceCue: (x: number, y: number) => void;
}) {
  const {
    svgRef,
    inputMode,
    aimAngle,
    power,
    spin,
    setSpin,
    calledPocketIndex,
    setCalledPocketIndex,
    needsCallPocket,
    ghostPreview,
    ballsToRender,
    placingPreview,
    showCue,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onWheel,
    hint,
  } = useEightBallControls({
    game,
    enabled,
    ballInHand: game.ballInHand,
    turnUserId,
    userId,
    onShoot,
    onPlaceCue,
  });

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/40">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${EIGHT_BALL_VIEW_WIDTH} ${EIGHT_BALL_VIEW_HEIGHT}`}
          className="block aspect-[2/1] h-auto w-full select-none touch-none"
          style={{ touchAction: "none" }}
          role="img"
          aria-label="8-ball pool table"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onWheel={onWheel}
        >
          <EightBallTableSvg
            balls={ballsToRender}
            aimAngle={aimAngle}
            power={power}
            showCue={showCue}
            placingCue={placingPreview}
            ghostPreview={ghostPreview}
            calledPocketIndex={calledPocketIndex}
            pocketPickMode={enabled && needsCallPocket && !game.ballInHand}
            onPocketPick={setCalledPocketIndex}
          />
        </svg>

        {enabled && power > 0 && !game.ballInHand && (
          <PowerMeter power={power} vertical={inputMode === "mouse"} />
        )}

        {enabled && !game.ballInHand && (
          <div className="absolute bottom-3 left-3 z-10">
            <EightBallSpinPad spin={spin} onChange={setSpin} />
          </div>
        )}
      </div>

      {enabled && <p className="text-center text-xs text-emerald-100/60">{hint}</p>}
    </div>
  );
}

export function EightBallLive({
  snapshot,
  sendMove,
  movePending = false,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
  movePending?: boolean;
}) {
  const { user } = useAuth();
  const game = snapshot.state as EightBallState;

  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";
  const myGroup = user?.id ? game.assignments[user.id] : null;
  const interactionEnabled = !finished && isMyTurn && !movePending;

  return (
    <Card className="overflow-hidden border-emerald-900/30 bg-gradient-to-b from-emerald-950 to-slate-950 p-3 sm:p-4">
      <CardTitle className="mb-1 text-base text-emerald-50">
        {finished
          ? snapshot.winnerUserId
            ? `${playerName(snapshot, snapshot.winnerUserId)} wins`
            : "Game over"
          : isMyTurn
            ? game.ballInHand
              ? "Ball in hand"
              : movePending
                ? "Shooting…"
                : "Your shot"
            : `${playerName(snapshot, snapshot.currentTurnUserId)}'s shot`}
      </CardTitle>

      <p className="mb-3 text-sm text-emerald-100/70">
        {game.lastEvent ??
          (game.tableOpen
            ? "Open table — pocket a ball to claim solids or stripes."
            : myGroup
              ? `You're on ${myGroup}.`
              : "Sink the 8 to win.")}
      </p>

      <EightBallInteractiveTable
        game={game}
        enabled={interactionEnabled}
        turnUserId={snapshot.currentTurnUserId}
        userId={user?.id ?? null}
        onShoot={(payload) =>
          sendMove("shot", {
            angle: payload.angle,
            power: payload.power,
            spin: payload.spin,
            ...(payload.calledPocket != null ? { calledPocket: payload.calledPocket } : {}),
          })
        }
        onPlaceCue={(x, y) => sendMove("place_cue", { x, y })}
      />
    </Card>
  );
}
