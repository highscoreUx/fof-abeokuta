"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LudoDieChoice, LudoState } from "@/lib/social-games/game-state-types";
import {
  DEFAULT_SOCIAL_LUDO_SETTINGS,
  type SocialLudoSettings,
} from "@/lib/chat-game-ludo-settings";
import {
  LUDO_ANIMATION_STEP_MS,
  ludoMoveAnimationFrames,
} from "@/lib/social-games/ludo-move-animation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import {
  LUDO_CENTER_FINISH_WEDGES,
  LUDO_GRID,
  LUDO_PLAYER_COLORS,
  LUDO_PLAYER_NAMES,
  LUDO_SEEDS_PER_CORNER,
  LUDO_YARDS,
  ludoBaseZoneSeat,
  ludoCellKind,
  ludoHomeColumnArrow,
  ludoHomeColumnSeat,
  ludoPathStartSeat,
  ludoPieceCoords,
  ludoYardSeat,
} from "@/lib/social-games/ludo-board-layout";
import {
  ludoDiceSum,
  ludoDiceUsed,
  ludoDieChoiceLabel,
  ludoFlipBoardForViewer,
  ludoHasLegalMove,
  ludoIsPieceAtHome,
  ludoLegalChoicesForPiece,
  ludoPieceHasLegalMove,
  ludoRemainingDice,
  ludoYardSlotIndex,
  normalizeLudoState,
} from "@/lib/social-games/ludo-helpers";

function playerName(snapshot: SocialGameMatchSnapshot, userId: string | null | undefined) {
  if (!userId) return "Player";
  const player = snapshot.players.find((entry) => entry.userId === userId);
  return player?.firstName ?? "Player";
}

function LudoDie({ value, used = false }: { value: number; used?: boolean }) {
  const dots: Record<number, number[][]> = {
    1: [[1, 1]],
    2: [
      [0, 0],
      [2, 2],
    ],
    3: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    4: [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ],
    5: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
    ],
    6: [
      [0, 0],
      [0, 1],
      [0, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
  };

  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 bg-white shadow-lg sm:h-16 sm:w-16 ${
        used ? "border-neutral-200 opacity-40" : "border-neutral-300"
      }`}
    >
      <div className="grid h-10 w-10 grid-cols-3 grid-rows-3 gap-0.5">
        {Array.from({ length: 9 }).map((_, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const active = dots[value]?.some(([r, c]) => r === row && c === col);
          return (
            <div key={index} className="flex items-center justify-center">
              {active ? <span className="h-2 w-2 rounded-full bg-neutral-900" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LudoCenterFinish() {
  return (
    <>
      {LUDO_CENTER_FINISH_WEDGES.map((wedge) => (
        <span
          key={wedge.seat}
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: LUDO_PLAYER_COLORS[wedge.seat],
            clipPath: wedge.clipPath,
          }}
        />
      ))}
    </>
  );
}

function cellInlineStyle(row: number, col: number): CSSProperties | undefined {
  const yardSeat = ludoYardSeat(row, col);
  const homeSeat = ludoHomeColumnSeat(row, col);
  const startSeat = ludoPathStartSeat(row, col);
  const baseSeat = ludoBaseZoneSeat(row, col);
  const kind = ludoCellKind(row, col);

  if (yardSeat != null) {
    return { backgroundColor: `${LUDO_PLAYER_COLORS[yardSeat]}40` };
  }
  if (homeSeat != null) {
    return { backgroundColor: LUDO_PLAYER_COLORS[homeSeat] };
  }
  if (startSeat != null) {
    return { backgroundColor: LUDO_PLAYER_COLORS[startSeat] };
  }
  if (kind === "center-finish") {
    return { backgroundColor: "#ffffff" };
  }
  if (baseSeat != null && kind === "empty") {
    return { backgroundColor: `${LUDO_PLAYER_COLORS[baseSeat]}28` };
  }
  if (kind === "safe") {
    return { backgroundColor: "#fffde7" };
  }
  if (kind === "path") {
    return { backgroundColor: "#ffffff" };
  }
  return { backgroundColor: "#e8e8e8" };
}

interface BoardToken {
  userId: string;
  homeSeat: number;
  pieceId: number;
  row: number;
  col: number;
}

function piecePositionKey(userId: string, pieceId: number) {
  return `${userId}-${pieceId}`;
}

function snapshotPiecePositions(game: LudoState) {
  const map = new Map<
    string,
    { position: number; homeSeat: number; yardIndex: number }
  >();
  for (const [userId, pieces] of Object.entries(game.pieces)) {
    for (const piece of pieces) {
      map.set(piecePositionKey(userId, piece.id), {
        position: piece.position,
        homeSeat: piece.homeSeat,
        yardIndex: ludoYardSlotIndex(piece),
      });
    }
  }
  return map;
}

function pieceLayoutKey(game: LudoState, playerIds: string[]): string {
  return playerIds
    .flatMap((userId) =>
      (game.pieces[userId] ?? []).map(
        (piece) => `${userId}:${piece.id}:${piece.homeSeat}:${piece.position}`,
      ),
    )
    .join("|");
}

export function LudoLive({
  snapshot,
  sendMove,
  ludoSettings = DEFAULT_SOCIAL_LUDO_SETTINGS,
  turnDeadlineAt = null,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
  ludoSettings?: SocialLudoSettings;
  turnDeadlineAt?: number | null;
}) {
  const { user } = useAuth();
  const game = useMemo(() => normalizeLudoState(snapshot.state), [snapshot.state]);
  const [pendingPieceId, setPendingPieceId] = useState<number | null>(null);
  const [animOverrides, setAnimOverrides] = useState<Record<string, { row: number; col: number }>>(
    {},
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prevPositionsRef = useRef<Map<string, { position: number; homeSeat: number; yardIndex: number }>>(
    new Map(),
  );
  const positionsReadyRef = useRef(false);
  const animatingRef = useRef(false);
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myPieces = user?.id ? (game.pieces[user.id] ?? []) : [];
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";
  const showAnimations = ludoSettings.showAnimations;

  const layoutKey = useMemo(
    () => pieceLayoutKey(game, snapshot.players.map((player) => player.userId)),
    [game, snapshot.players],
  );
  const gameRef = useRef(game);
  gameRef.current = game;

  const stopPieceAnimation = (clearOverrides: boolean) => {
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    animatingRef.current = false;
    setIsAnimating(false);
    if (clearOverrides) setAnimOverrides({});
  };

  const runPieceAnimation = (
    movedKey: string,
    frames: Array<{ row: number; col: number }>,
  ) => {
    stopPieceAnimation(true);
    if (frames.length <= 1) return;

    animatingRef.current = true;
    setIsAnimating(true);
    let frameIndex = 0;
    setAnimOverrides({ [movedKey]: frames[0]! });

    animTimerRef.current = setInterval(() => {
      frameIndex += 1;
      if (frameIndex >= frames.length) {
        stopPieceAnimation(true);
        return;
      }
      setAnimOverrides({ [movedKey]: frames[frameIndex]! });
    }, LUDO_ANIMATION_STEP_MS);
  };

  useEffect(() => () => stopPieceAnimation(false), []);

  useEffect(() => {
    stopPieceAnimation(true);
    positionsReadyRef.current = false;
    prevPositionsRef.current = new Map();
  }, [snapshot.matchId]);

  useEffect(() => {
    if (!ludoSettings.turnTimerEnabled || !turnDeadlineAt || finished) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [ludoSettings.turnTimerEnabled, turnDeadlineAt, finished]);

  useEffect(() => {
    const current = snapshotPiecePositions(gameRef.current);

    if (!showAnimations) {
      stopPieceAnimation(true);
      prevPositionsRef.current = current;
      positionsReadyRef.current = true;
      return;
    }

    if (!positionsReadyRef.current) {
      prevPositionsRef.current = current;
      positionsReadyRef.current = true;
      return;
    }

    if (animatingRef.current) {
      prevPositionsRef.current = current;
      return;
    }

    let movedKey: string | null = null;
    let fromPosition = 0;
    let toPosition = 0;
    let homeSeat = 0;
    let yardIndex = 0;

    for (const [key, curr] of current) {
      const prev = prevPositionsRef.current.get(key);
      if (prev && prev.position !== curr.position) {
        movedKey = key;
        fromPosition = prev.position;
        toPosition = curr.position;
        homeSeat = curr.homeSeat;
        yardIndex = curr.yardIndex;
        break;
      }
    }

    prevPositionsRef.current = current;
    if (!movedKey) return;

    const frames = ludoMoveAnimationFrames(homeSeat, fromPosition, toPosition, yardIndex);
    runPieceAnimation(movedKey, frames);
  }, [layoutKey, showAnimations]);

  const tokens = useMemo(() => {
    const list: BoardToken[] = [];
    for (const player of snapshot.players) {
      const pieces = game.pieces[player.userId] ?? [];
      pieces.forEach((piece) => {
        const yardIndex = ludoYardSlotIndex(piece);
        const key = piecePositionKey(player.userId, piece.id);
        const override = animOverrides[key];
        const { row, col } =
          override ?? ludoPieceCoords(piece.homeSeat, piece.position, yardIndex);
        list.push({
          userId: player.userId,
          homeSeat: piece.homeSeat,
          pieceId: piece.id,
          row,
          col,
        });
      });
    }
    return list;
  }, [snapshot.players, game.pieces, animOverrides]);

  const tokensAt = (row: number, col: number) =>
    tokens.filter((token) => token.row === row && token.col === col);

  const activePlayers = snapshot.players.filter((player) =>
    game.playerOrder.includes(player.userId),
  );

  const activeCorners = useMemo(() => {
    const set = new Set<number>();
    for (const player of activePlayers) {
      for (const seat of game.playerSeats[player.userId] ?? []) {
        set.add(seat);
      }
    }
    return set;
  }, [activePlayers, game.playerSeats]);

  const myLegalMove = useMemo(
    () => (user?.id && game.dice != null ? ludoHasLegalMove(game, user.id) : false),
    [game, user?.id],
  );

  const displayedRoll = game.dice ?? game.lastRoll;
  const rollIsActive = game.dice != null;
  const rollOwnerId = rollIsActive ? snapshot.currentTurnUserId : game.lastRollUserId;
  const diceUsed = ludoDiceUsed(game);
  const remainingDice = ludoRemainingDice(game);

  const pendingPiece = pendingPieceId != null ? myPieces.find((p) => p.id === pendingPieceId) : null;
  const pendingChoices =
    pendingPiece && game.dice && user?.id
      ? ludoLegalChoicesForPiece(game, user.id, pendingPiece)
      : [];

  useEffect(() => {
    setPendingPieceId(null);
  }, [game.dice, game.diceUsed, snapshot.currentTurnUserId]);

  const handleSeedClick = (pieceId: number) => {
    if (!user?.id) return;
    const piece = myPieces.find((entry) => entry.id === pieceId);
    if (!piece || !game.dice) return;
    const choices = ludoLegalChoicesForPiece(game, user.id, piece);
    if (!choices.length) return;
    if (choices.length === 1) {
      sendMove("move", { pieceId, dieChoice: choices[0] });
      return;
    }
    setPendingPieceId(pieceId);
  };

  const flipBoard = useMemo(() => {
    if (game.mode !== "two_player" || !user?.id) return false;
    return ludoFlipBoardForViewer(game.playerSeats[user.id] ?? []);
  }, [game.mode, game.playerSeats, user?.id]);

  const autoPassKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !isMyTurn || finished || game.dice == null || isAnimating) return;
    if (ludoHasLegalMove(game, user.id)) return;

    const key = `${game.dice[0]}-${game.dice[1]}-${snapshot.currentTurnUserId}`;
    if (autoPassKeyRef.current === key) return;
    autoPassKeyRef.current = key;
    sendMove("pass");
  }, [user?.id, isMyTurn, finished, game, snapshot.currentTurnUserId, sendMove, isAnimating]);

  const turnSecondsLeft =
    ludoSettings.turnTimerEnabled && turnDeadlineAt && !finished
      ? Math.max(0, Math.ceil((turnDeadlineAt - now) / 1000))
      : null;

  return (
    <Card className="p-4">
      <CardTitle className="mb-2 text-center text-base">
        {finished
          ? `${playerName(snapshot, snapshot.winnerUserId)} wins!`
          : isMyTurn
            ? "Your turn"
            : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`}
      </CardTitle>

      {turnSecondsLeft != null && (
        <p className="mb-2 text-center text-xs text-muted-foreground">
          {turnSecondsLeft}s left this turn
        </p>
      )}

      {game.mode === "two_player" && (
        <p className="mb-3 text-center text-xs text-muted-foreground">
          2-player — {LUDO_SEEDS_PER_CORNER} seeds in each of your two corners (
          {LUDO_SEEDS_PER_CORNER * 2} total).
        </p>
      )}

      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        <div
          className={`rounded-xl border-4 border-neutral-700 bg-[#f5e6c8] p-1.5 shadow-xl transition-transform ${flipBoard ? "rotate-180" : ""}`}
        >
          <div
            className="grid gap-px bg-neutral-500/40"
            style={{
              gridTemplateColumns: `repeat(${LUDO_GRID}, minmax(0, 1fr))`,
              width: "min(92vw, 24rem)",
              aspectRatio: "1",
            }}
          >
            {Array.from({ length: LUDO_GRID * LUDO_GRID }).map((_, index) => {
              const row = Math.floor(index / LUDO_GRID);
              const col = index % LUDO_GRID;
              const kind = ludoCellKind(row, col);
              const here = tokensAt(row, col);
              const yardCorner = ludoYardSeat(row, col);
              const homeSeat = ludoHomeColumnSeat(row, col);
              const arrow =
                homeSeat != null ? ludoHomeColumnArrow(row, col, homeSeat) : null;

              const yardSlot =
                yardCorner != null
                  ? LUDO_YARDS[yardCorner]!.findIndex(([r, c]) => r === row && c === col)
                  : -1;

              return (
                <div
                  key={`${row}-${col}`}
                  className="relative flex aspect-square items-center justify-center border border-neutral-400/30"
                  style={cellInlineStyle(row, col)}
                >
                  {yardCorner != null && yardSlot >= 0 && activeCorners.has(yardCorner) && (
                    <>
                      {!here.length && (
                        <span className="h-[52%] w-[52%] rounded-full border-2 border-white/90 bg-white/30 shadow-inner" />
                      )}
                    </>
                  )}

                  {kind === "center-finish" && <LudoCenterFinish />}

                  {arrow && (
                    <span className="pointer-events-none text-[10px] font-bold text-white/90 drop-shadow">
                      {arrow === "up" ? "↑" : arrow === "down" ? "↓" : arrow === "left" ? "←" : "→"}
                    </span>
                  )}

                  {kind === "path" && (
                    <span className="pointer-events-none absolute bottom-0 right-0 text-[7px] text-neutral-300">
                      ·
                    </span>
                  )}

                  {here.map((token, stackIndex) => {
                    const color = LUDO_PLAYER_COLORS[token.homeSeat]!;
                    const isMine = token.userId === user?.id;
                    const piece = myPieces.find((entry) => entry.id === token.pieceId);
                    const tokenKey = piecePositionKey(token.userId, token.pieceId);
                    const isThisPieceAnimating = Boolean(animOverrides[tokenKey]);
                    const canSelect =
                      isMyTurn &&
                      !finished &&
                      !isThisPieceAnimating &&
                      isMine &&
                      game.dice != null &&
                      piece != null &&
                      ludoPieceHasLegalMove(game, user.id, piece);

                    return (
                      <button
                        key={`${token.userId}-${token.pieceId}`}
                        type="button"
                        disabled={!canSelect}
                        onClick={() => canSelect && handleSeedClick(token.pieceId)}
                        className={`absolute z-10 h-[54%] w-[54%] rounded-full border-2 border-white shadow-md transition ${
                          canSelect
                            ? pendingPieceId === token.pieceId
                              ? "cursor-pointer ring-2 ring-primary scale-110"
                              : "cursor-pointer ring-2 ring-amber-400 hover:scale-110"
                            : ""
                        }`}
                        style={{
                          backgroundColor: color,
                          transform: `translate(${stackIndex * 2}px, ${stackIndex * -2}px)`,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                        }}
                        title={`${LUDO_PLAYER_NAMES[token.homeSeat]} seed ${(token.pieceId % LUDO_SEEDS_PER_CORNER) + 1}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col items-center gap-4">
          {displayedRoll != null ? (
            <div className={`flex flex-col items-center gap-2 ${rollIsActive ? "" : "opacity-90"}`}>
              <div className="flex items-center gap-3">
                <LudoDie value={displayedRoll[0]} used={rollIsActive && diceUsed[0]} />
                <LudoDie value={displayedRoll[1]} used={rollIsActive && diceUsed[1]} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {rollIsActive && isMyTurn
                  ? myLegalMove
                    ? remainingDice.length === 2
                      ? "Tap a seed — use one die, the other, or both combined"
                      : `Use your remaining die (${remainingDice.map((d) => d.value).join(", ")})`
                    : "No legal move — passing turn…"
                  : `${playerName(snapshot, rollOwnerId)} rolled ${displayedRoll[0]} + ${displayedRoll[1]}`}
              </p>
              {game.capturedThisTurn && rollIsActive && (
                <p className="text-center text-xs font-medium text-amber-700">
                  Take out! Bonus roll after you finish this turn.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-xs text-muted-foreground sm:h-16 sm:w-16">
                  Die
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-xs text-muted-foreground sm:h-16 sm:w-16">
                  Die
                </div>
              </div>
            </div>
          )}

          {pendingPiece && pendingChoices.length > 1 && (
            <div className="w-full space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-center text-xs font-medium text-muted-foreground">
                Which die for this seed?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {pendingChoices.map((choice) => (
                  <Button
                    key={String(choice)}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      sendMove("move", { pieceId: pendingPiece.id, dieChoice: choice });
                      setPendingPieceId(null);
                    }}
                  >
                    {choice === "sum"
                      ? `Both (${ludoDiceSum(game.dice!)})`
                      : `Die ${ludoDieChoiceLabel(game, choice as LudoDieChoice)}`}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setPendingPieceId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isMyTurn && !finished && game.dice == null && (
            <Button
              size="lg"
              className="w-full"
              disabled={isAnimating}
              onClick={() => sendMove("roll")}
            >
              Roll dice
            </Button>
          )}

          {!isMyTurn && !finished && game.dice == null && displayedRoll == null && (
            <p className="text-sm text-muted-foreground">
              Waiting for {playerName(snapshot, snapshot.currentTurnUserId)} to roll
            </p>
          )}

          <div className="w-full space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            {activePlayers.map((player) => {
              const corners = game.playerSeats[player.userId] ?? [];
              const pieceCount = game.pieces[player.userId]?.length ?? 0;
              const inHome = (game.pieces[player.userId] ?? []).filter((piece) =>
                ludoIsPieceAtHome(piece),
              ).length;
              const isActive = snapshot.currentTurnUserId === player.userId;
              return (
                <div
                  key={player.userId}
                  className={`flex items-center gap-2 text-sm ${isActive ? "font-semibold" : ""}`}
                >
                  <span className="flex gap-1">
                    {corners.map((seat) => (
                      <span
                        key={seat}
                        className="h-3 w-3 shrink-0 rounded-full border border-white shadow"
                        style={{ backgroundColor: LUDO_PLAYER_COLORS[seat] }}
                      />
                    ))}
                  </span>
                  <span className="flex-1">{player.firstName}</span>
                  <span className="text-xs text-muted-foreground">
                    {inHome}/{pieceCount} home
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
