"use client";

import { useMemo, type CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import {
  LUDO_CENTER_FINISH_WEDGES,
  LUDO_GRID,
  LUDO_HOME,
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
import { ludoDiceSum, ludoFlipBoardForViewer, ludoYardSlotIndex, normalizeLudoState } from "@/lib/social-games/ludo-helpers";

function playerName(snapshot: SocialGameMatchSnapshot, userId: string | null | undefined) {
  if (!userId) return "Player";
  const player = snapshot.players.find((entry) => entry.userId === userId);
  return player?.firstName ?? "Player";
}

function LudoDie({ value }: { value: number }) {
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
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-neutral-300 bg-white shadow-lg sm:h-16 sm:w-16">
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

export function LudoLive({
  snapshot,
  sendMove,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const game = useMemo(() => normalizeLudoState(snapshot.state), [snapshot.state]);
  const myPieces = user?.id ? (game.pieces[user.id] ?? []) : [];
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";

  const tokens = useMemo(() => {
    const list: BoardToken[] = [];
    for (const player of snapshot.players) {
      const pieces = game.pieces[player.userId] ?? [];
      pieces.forEach((piece) => {
        const yardIndex = ludoYardSlotIndex(piece);
        const { row, col } = ludoPieceCoords(piece.homeSeat, piece.position, yardIndex);
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
  }, [snapshot.players, game.pieces]);

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

  const flipBoard = useMemo(() => {
    if (game.mode !== "two_player" || !user?.id) return false;
    return ludoFlipBoardForViewer(game.playerSeats[user.id] ?? []);
  }, [game.mode, game.playerSeats, user?.id]);

  return (
    <Card className="p-4">
      <CardTitle className="mb-2 text-center text-base">
        {finished
          ? `${playerName(snapshot, snapshot.winnerUserId)} wins!`
          : isMyTurn
            ? "Your turn"
            : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`}
      </CardTitle>

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
                    const canSelect =
                      isMyTurn &&
                      !finished &&
                      isMine &&
                      game.dice != null &&
                      myPieces.some((piece) => piece.id === token.pieceId);

                    return (
                      <button
                        key={`${token.userId}-${token.pieceId}`}
                        type="button"
                        disabled={!canSelect}
                        onClick={() => canSelect && sendMove("move", { pieceId: token.pieceId })}
                        className={`absolute z-10 h-[54%] w-[54%] rounded-full border-2 border-white shadow-md transition ${
                          canSelect ? "cursor-pointer ring-2 ring-amber-400 hover:scale-110" : ""
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
          {game.dice != null ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <LudoDie value={game.dice[0]} />
                <LudoDie value={game.dice[1]} />
              </div>
              <p className="text-sm text-muted-foreground">
                Total {ludoDiceSum(game.dice)} — tap a seed to move
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-xs text-muted-foreground sm:h-16 sm:w-16">
                Die
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-xs text-muted-foreground sm:h-16 sm:w-16">
                Die
              </div>
            </div>
          )}

          {isMyTurn && !finished && game.dice == null && (
            <Button size="lg" className="w-full" onClick={() => sendMove("roll")}>
              Roll dice
            </Button>
          )}

          <div className="w-full space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            {activePlayers.map((player) => {
              const corners = game.playerSeats[player.userId] ?? [];
              const pieceCount = game.pieces[player.userId]?.length ?? 0;
              const inHome = (game.pieces[player.userId] ?? []).filter(
                (piece) => piece.position === LUDO_HOME,
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
