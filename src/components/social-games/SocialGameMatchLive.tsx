"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialJsonGameKind } from "@/lib/social-games/kinds";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import type {
  ChessState,
  LudoState,
  SudokuState,
  WhotCard,
  WhotShape,
  WhotState,
} from "@/lib/social-games/game-state-types";

interface SocialGameMatchLiveProps {
  matchId: string;
  kind: SocialJsonGameKind;
  sessionId?: string;
}

const PIECE_SYMBOLS: Record<string, string> = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
};

const WHOT_SHAPES: WhotShape[] = ["circle", "triangle", "cross", "square", "star"];

function playerName(snapshot: SocialGameMatchSnapshot, userId: string | null | undefined) {
  if (!userId) return "Player";
  const player = snapshot.players.find((entry) => entry.userId === userId);
  return player?.firstName ?? "Player";
}

function parseFenBoard(fen: string): (string | null)[][] {
  const rows = fen.split(" ")[0]?.split("/") ?? [];
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const char of row) {
      if (/\d/.test(char)) {
        const empty = parseInt(char, 10);
        for (let i = 0; i < empty; i += 1) cells.push(null);
      } else {
        cells.push(char);
      }
    }
    return cells;
  });
}

function squareName(row: number, col: number) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function useSocialGameState(matchId: string) {
  const socket = useSocket();
  const [state, setState] = useState<SocialGameMatchSnapshot | null>(null);
  const joinedMatchId = useRef<string | null>(null);

  useEffect(() => {
    setState(null);
    joinedMatchId.current = null;
  }, [matchId]);

  useEffect(() => {
    if (!socket || !matchId) return;

    const onState = (snapshot: SocialGameMatchSnapshot) => {
      if (snapshot.matchId !== matchId) return;
      setState(snapshot);
    };

    socket.on("social-game:state", onState);
    return () => {
      socket.off("social-game:state", onState);
    };
  }, [socket, matchId]);

  useEffect(() => {
    if (!socket || !matchId) return;
    if (joinedMatchId.current === matchId) return;
    joinedMatchId.current = matchId;
    socket.emit("social-game:join", matchId);
  }, [socket, matchId]);

  const sendMove = (action: string, payload: Record<string, unknown> = {}) => {
    if (!socket) return;
    socket.emit("social-game:move", { matchId, action, payload });
  };

  return { state, sendMove };
}

function ChessLive({
  snapshot,
  sendMove,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const game = snapshot.state as ChessState;
  const board = useMemo(() => parseFenBoard(game.fen), [game.fen]);
  const [selected, setSelected] = useState<string | null>(null);

  const mySeat = snapshot.players.find((player) => player.userId === user?.id)?.seat ?? null;
  const myColor = mySeat === "0" || mySeat === "X" ? "w" : "b";
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";

  const onSquareClick = (row: number, col: number) => {
    if (finished || !isMyTurn) return;
    const square = squareName(row, col);
    if (!selected) {
      setSelected(square);
      return;
    }
    if (selected === square) {
      setSelected(null);
      return;
    }
    sendMove("move", { from: selected, to: square });
    setSelected(null);
  };

  return (
    <Card className="p-4">
      <CardTitle className="mb-3 text-base">
        {finished
          ? snapshot.winnerUserId
            ? `${playerName(snapshot, snapshot.winnerUserId)} wins`
            : "Draw"
          : isMyTurn
            ? "Your turn"
            : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`}
      </CardTitle>
      <div className="inline-block rounded-lg border border-border p-2">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((piece, colIndex) => {
              const dark = (rowIndex + colIndex) % 2 === 1;
              const square = squareName(rowIndex, colIndex);
              const isSelected = selected === square;
              return (
                <button
                  key={square}
                  type="button"
                  disabled={finished || !isMyTurn}
                  onClick={() => onSquareClick(rowIndex, colIndex)}
                  className={`flex h-10 w-10 items-center justify-center text-xl sm:h-12 sm:w-12 ${
                    dark ? "bg-muted" : "bg-card"
                  } ${isSelected ? "ring-2 ring-primary" : ""}`}
                >
                  {piece ? PIECE_SYMBOLS[piece] ?? piece : ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        You play as {myColor === "w" ? "White" : "Black"}. Tap a piece, then a destination.
      </p>
    </Card>
  );
}

function SudokuLive({
  snapshot,
  sendMove,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const game = snapshot.state as SudokuState;
  const myBoard = user?.id ? (game.boards[user.id] ?? game.puzzle) : game.puzzle;
  const [selected, setSelected] = useState<number | null>(null);
  const finished = snapshot.status === "FINISHED";

  const setCell = (value: number) => {
    if (selected == null || finished) return;
    sendMove("cell", { index: selected, value });
    setSelected(null);
  };

  return (
    <Card className="p-4">
      <CardTitle className="mb-3 text-base">
        {finished
          ? snapshot.winnerUserId
            ? `${playerName(snapshot, snapshot.winnerUserId)} finished first`
            : "Puzzle complete"
          : "Race — first correct completion wins"}
      </CardTitle>
      <div className="inline-grid grid-cols-9 gap-px rounded-lg border border-border bg-border p-1">
        {myBoard.split("").map((cell, index) => {
          const fixed = game.puzzle[index] !== "0";
          const selectedCell = selected === index;
          return (
            <button
              key={index}
              type="button"
              disabled={finished || fixed}
              onClick={() => !fixed && setSelected(index)}
              className={`flex h-8 w-8 items-center justify-center text-sm sm:h-10 sm:w-10 ${
                fixed ? "bg-muted font-semibold text-foreground" : "bg-card"
              } ${selectedCell ? "ring-2 ring-primary" : ""}`}
            >
              {cell === "0" ? "" : cell}
            </button>
          );
        })}
      </div>
      {selected != null && !finished && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
            <Button key={value} size="sm" variant="outline" onClick={() => setCell(value)}>
              {value}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setCell(0)}>
            Clear
          </Button>
        </div>
      )}
    </Card>
  );
}

function WhotCardView({ card }: { card: WhotCard }) {
  return (
    <span className="inline-flex min-w-[3rem] flex-col items-center rounded border border-border bg-card px-2 py-1 text-xs">
      <span className="capitalize">{card.shape}</span>
      <span className="font-semibold">{card.number}</span>
    </span>
  );
}

function WhotLive({
  snapshot,
  sendMove,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const game = snapshot.state as WhotState;
  const hand = user?.id ? (game.hands[user.id] ?? []) : [];
  const top = game.discard[0];
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";
  const [pendingWhot, setPendingWhot] = useState<string | null>(null);

  const playCard = (cardId: string, shape?: WhotShape) => {
    sendMove("play", shape ? { cardId, shape } : { cardId });
    setPendingWhot(null);
  };

  return (
    <Card className="space-y-4 p-4">
      <CardTitle className="text-base">
        {finished
          ? `${playerName(snapshot, snapshot.winnerUserId)} wins`
          : isMyTurn
            ? "Your turn"
            : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`}
      </CardTitle>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Top card:</span>
        {top ? <WhotCardView card={top} /> : <span className="text-sm">—</span>}
        {game.currentShape && (
          <span className="text-sm text-muted-foreground capitalize">
            Called shape: {game.currentShape}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {hand.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={!isMyTurn || finished}
            onClick={() => {
              if (card.shape === "whot") {
                setPendingWhot(card.id);
                return;
              }
              playCard(card.id);
            }}
            className="disabled:opacity-50"
          >
            <WhotCardView card={card} />
          </button>
        ))}
      </div>
      {pendingWhot && (
        <div className="flex flex-wrap gap-2">
          {WHOT_SHAPES.map((shape) => (
            <Button key={shape} size="sm" variant="outline" onClick={() => playCard(pendingWhot, shape)}>
              {shape}
            </Button>
          ))}
        </div>
      )}
      {isMyTurn && !finished && (
        <Button size="sm" variant="secondary" onClick={() => sendMove("draw")}>
          Draw card
        </Button>
      )}
    </Card>
  );
}

function LudoLive({
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

  return (
    <Card className="space-y-4 p-4">
      <CardTitle className="text-base">
        {finished
          ? `${playerName(snapshot, snapshot.winnerUserId)} wins`
          : isMyTurn
            ? "Your turn"
            : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`}
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Dice: {game.dice ?? "—"}
        {game.lastRoll != null ? ` (rolled ${game.lastRoll})` : ""}
      </p>
      <div className="space-y-2">
        {snapshot.players.map((player) => {
          const pieces = game.pieces[player.userId] ?? [];
          return (
            <div key={player.userId} className="rounded border border-border p-2 text-sm">
              <span className="font-medium">{player.firstName}</span>
              <span className="ml-2 text-muted-foreground">
                {pieces.map((piece) => `P${piece.id}:${piece.position}`).join(" · ")}
              </span>
            </div>
          );
        })}
      </div>
      {isMyTurn && !finished && (
        <div className="flex flex-wrap gap-2">
          {game.dice == null ? (
            <Button size="sm" onClick={() => sendMove("roll")}>
              Roll dice
            </Button>
          ) : (
            myPieces.map((piece) => (
              <Button
                key={piece.id}
                size="sm"
                variant="outline"
                onClick={() => sendMove("move", { pieceId: piece.id })}
              >
                Move piece {piece.id + 1}
              </Button>
            ))
          )}
        </div>
      )}
    </Card>
  );
}

export function SocialGameMatchLive({ matchId, kind }: SocialGameMatchLiveProps) {
  const { state, sendMove } = useSocialGameState(matchId);

  if (!state) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Connecting to game…</p>
      </Card>
    );
  }

  if (kind === "chess") return <ChessLive snapshot={state} sendMove={sendMove} />;
  if (kind === "sudoku") return <SudokuLive snapshot={state} sendMove={sendMove} />;
  if (kind === "whot") return <WhotLive snapshot={state} sendMove={sendMove} />;
  if (kind === "ludo") return <LudoLive snapshot={state} sendMove={sendMove} />;

  return (
    <Card className="p-6 text-center">
      <p className="text-sm text-muted-foreground">Unsupported game.</p>
    </Card>
  );
}
