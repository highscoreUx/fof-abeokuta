"use client";

import { useMemo, type CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import type { LudoState } from "@/lib/social-games/game-state-types";
import {
  LUDO_GRID,
  LUDO_HOME,
  LUDO_PLAYER_COLORS,
  LUDO_PLAYER_NAMES,
  ludoCellKind,
  ludoBaseZoneSeat,
  ludoHomeColumnSeat,
  ludoPieceCoords,
  ludoYardSeat,
} from "@/lib/social-games/ludo-board-layout";

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

function cellBackground(row: number, col: number): string {
  const kind = ludoCellKind(row, col);
  const yardSeat = ludoYardSeat(row, col);
  const homeSeat = ludoHomeColumnSeat(row, col);

  if (kind === "center") {
    return "bg-neutral-100";
  }
  if (yardSeat != null) {
    const color = LUDO_PLAYER_COLORS[yardSeat]!;
    return `opacity-90`;
  }
  if (homeSeat != null) {
    return "";
  }
  if (kind === "path" || kind === "safe") {
    return "bg-white";
  }
  return "bg-neutral-200/80";
}

function cellInlineStyle(row: number, col: number): CSSProperties | undefined {
  const yardSeat = ludoYardSeat(row, col);
  const homeSeat = ludoHomeColumnSeat(row, col);
  const baseSeat = ludoBaseZoneSeat(row, col);
  const kind = ludoCellKind(row, col);

  if (yardSeat != null) {
    return { backgroundColor: `${LUDO_PLAYER_COLORS[yardSeat]}33` };
  }
  if (homeSeat != null) {
    return { backgroundColor: LUDO_PLAYER_COLORS[homeSeat] };
  }
  if (kind === "center") {
    return {
      background: `conic-gradient(${LUDO_PLAYER_COLORS[0]} 0 25%, ${LUDO_PLAYER_COLORS[1]} 0 50%, ${LUDO_PLAYER_COLORS[2]} 0 75%, ${LUDO_PLAYER_COLORS[3]} 0)`,
    };
  }
  if (baseSeat != null && kind === "empty") {
    return { backgroundColor: `${LUDO_PLAYER_COLORS[baseSeat]}18` };
  }
  if (kind === "safe") {
    return { backgroundColor: "#fffde7" };
  }
  return undefined;
}

interface BoardToken {
  userId: string;
  seat: number;
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
  const game = snapshot.state as LudoState;
  const myPieces = user?.id ? (game.pieces[user.id] ?? []) : [];
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";

  const seatByUserId = useMemo(() => {
    const map = new Map<string, number>();
    game.playerOrder.forEach((userId, seat) => map.set(userId, seat));
    return map;
  }, [game.playerOrder]);

  const tokens = useMemo(() => {
    const list: BoardToken[] = [];
    for (const player of snapshot.players) {
      const seat = seatByUserId.get(player.userId) ?? 0;
      const pieces = game.pieces[player.userId] ?? [];
      pieces.forEach((piece) => {
        const { row, col } = ludoPieceCoords(seat, piece.position, piece.id);
        list.push({
          userId: player.userId,
          seat,
          pieceId: piece.id,
          row,
          col,
        });
      });
    }
    return list;
  }, [snapshot.players, game.pieces, seatByUserId]);

  const tokensAt = (row: number, col: number) =>
    tokens.filter((token) => token.row === row && token.col === col);

  const activeCount = snapshot.players.filter((player) => game.playerOrder.includes(player.userId)).length;

  return (
    <Card className="p-4">
      <CardTitle className="mb-3 text-center text-base">
        {finished
          ? `${playerName(snapshot, snapshot.winnerUserId)} wins!`
          : isMyTurn
            ? "Your turn"
            : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`}
      </CardTitle>

      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        <div className="rounded-xl border-4 border-neutral-700 bg-neutral-300 p-1 shadow-xl">
          <div
            className="grid gap-px bg-neutral-400"
            style={{
              gridTemplateColumns: `repeat(${LUDO_GRID}, minmax(0, 1fr))`,
              width: "min(92vw, 22rem)",
              aspectRatio: "1",
            }}
          >
            {Array.from({ length: LUDO_GRID * LUDO_GRID }).map((_, index) => {
              const row = Math.floor(index / LUDO_GRID);
              const col = index % LUDO_GRID;
              const kind = ludoCellKind(row, col);
              const here = tokensAt(row, col);
              const isPath = kind === "path" || kind === "safe";

              return (
                <div
                  key={`${row}-${col}`}
                  className={`relative aspect-square border border-neutral-300/40 ${cellBackground(row, col)} ${
                    isPath ? "bg-white" : ""
                  }`}
                  style={cellInlineStyle(row, col)}
                >
                  {here.map((token, stackIndex) => {
                    const color = LUDO_PLAYER_COLORS[token.seat]!;
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
                        className={`absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition ${
                          canSelect ? "cursor-pointer ring-2 ring-amber-400 hover:scale-110" : ""
                        }`}
                        style={{
                          backgroundColor: color,
                          transform: `translate(calc(-50% + ${stackIndex * 3}px), calc(-50% + ${stackIndex * -3}px))`,
                        }}
                        title={`${LUDO_PLAYER_NAMES[token.seat]} piece ${token.pieceId + 1}`}
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
              <LudoDie value={game.dice} />
              <p className="text-sm text-muted-foreground">Tap a token to move</p>
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-sm text-muted-foreground">
              Dice
            </div>
          )}

          {isMyTurn && !finished && game.dice == null && (
            <Button size="lg" className="w-full" onClick={() => sendMove("roll")}>
              Roll dice
            </Button>
          )}

          <div className="w-full space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            {snapshot.players.slice(0, activeCount).map((player) => {
              const seat = seatByUserId.get(player.userId) ?? 0;
              const inHome = (game.pieces[player.userId] ?? []).filter(
                (piece) => piece.position === LUDO_HOME,
              ).length;
              const isActive = snapshot.currentTurnUserId === player.userId;
              return (
                <div
                  key={player.userId}
                  className={`flex items-center gap-2 text-sm ${isActive ? "font-semibold" : ""}`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-white shadow"
                    style={{ backgroundColor: LUDO_PLAYER_COLORS[seat] }}
                  />
                  <span className="flex-1">{player.firstName}</span>
                  <span className="text-xs text-muted-foreground">{inHome} in yard</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
