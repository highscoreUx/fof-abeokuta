"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialChessSettings } from "@/lib/chat-game-chess-settings";
import { DEFAULT_SOCIAL_CHESS_SETTINGS } from "@/lib/chat-game-chess-settings";
import type { SocialJsonGameKind } from "@/lib/social-games/kinds";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import type { ChessState, SudokuState } from "@/lib/social-games/game-state-types";
import { WhotLive } from "@/components/social-games/WhotLive";
import { LudoLive } from "@/components/social-games/LudoLive";

interface SocialGameMatchLiveProps {
  matchId: string;
  kind: SocialJsonGameKind;
  sessionId?: string;
  chessSettings?: SocialChessSettings;
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

function parseSquare(square: string): { row: number; col: number } {
  const col = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1] ?? "1", 10);
  return { row: 8 - rank, col };
}

function pieceColor(piece: string | null): "w" | "b" | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
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
  chessSettings = DEFAULT_SOCIAL_CHESS_SETTINGS,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
  chessSettings?: SocialChessSettings;
}) {
  const { user } = useAuth();
  const game = snapshot.state as ChessState;
  const board = useMemo(() => parseFenBoard(game.fen), [game.fen]);
  const [selected, setSelected] = useState<string | null>(null);

  const mySeat = snapshot.players.find((player) => player.userId === user?.id)?.seat ?? null;
  const myColor = mySeat === "0" || mySeat === "X" ? "w" : "b";
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";
  const showLegalMoves = chessSettings.showLegalMoves;

  const legalMoves = useMemo(() => {
    if (!showLegalMoves || !selected || !isMyTurn || finished) return [];
    try {
      const chess = new Chess(game.fen);
      return chess.moves({ square: selected as Square, verbose: true });
    } catch {
      return [];
    }
  }, [showLegalMoves, selected, isMyTurn, finished, game.fen]);

  const legalTargets = useMemo(
    () => new Set<string>(legalMoves.map((move) => move.to as string)),
    [legalMoves],
  );

  const onSquareClick = (row: number, col: number) => {
    if (finished || !isMyTurn) return;
    const square = squareName(row, col);
    const piece = board[row]?.[col] ?? null;

    if (!selected) {
      if (pieceColor(piece) === myColor) setSelected(square);
      return;
    }

    if (selected === square) {
      if (pieceColor(piece) === myColor) return;
      setSelected(null);
      return;
    }

    if (pieceColor(piece) === myColor) {
      setSelected(square);
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
        <div className="relative">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((piece, colIndex) => {
                const dark = (rowIndex + colIndex) % 2 === 1;
                const square = squareName(rowIndex, colIndex);
                const isSelected = selected === square;
                const isLegalTarget = legalTargets.has(square);
                return (
                  <button
                    key={square}
                    type="button"
                    disabled={finished || !isMyTurn}
                    onClick={() => onSquareClick(rowIndex, colIndex)}
                    className={`relative flex h-10 w-10 items-center justify-center text-xl sm:h-12 sm:w-12 ${
                      dark ? "bg-muted" : "bg-card"
                    } ${isSelected ? "ring-2 ring-primary" : ""} ${
                      isLegalTarget ? "ring-2 ring-emerald-500/70" : ""
                    }`}
                  >
                    {piece ? PIECE_SYMBOLS[piece] ?? piece : ""}
                    {isLegalTarget && !piece && (
                      <span className="absolute h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {showLegalMoves && selected && legalMoves.length > 0 && (
            <svg
              viewBox="0 0 8 8"
              className="pointer-events-none absolute inset-0 h-full w-full text-primary"
              aria-hidden
            >
              <defs>
                <marker
                  id="chess-move-arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="4"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" opacity="0.85" />
                </marker>
              </defs>
              {legalMoves.map((move) => {
                const from = parseSquare(move.from);
                const to = parseSquare(move.to);
                return (
                  <line
                    key={`${move.from}-${move.to}-${move.san}`}
                    x1={from.col + 0.5}
                    y1={from.row + 0.5}
                    x2={to.col + 0.5}
                    y2={to.row + 0.5}
                    stroke="currentColor"
                    strokeWidth={0.1}
                    strokeOpacity={0.75}
                    markerEnd="url(#chess-move-arrow)"
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        You play as {myColor === "w" ? "White" : "Black"}. Tap a piece, then a destination.
        {showLegalMoves ? " Direction lines show legal moves." : ""}
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

export function SocialGameMatchLive({ matchId, kind, chessSettings }: SocialGameMatchLiveProps) {
  const { state, sendMove } = useSocialGameState(matchId);

  if (!state) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Connecting to game…</p>
      </Card>
    );
  }

  if (kind === "chess") {
    return <ChessLive snapshot={state} sendMove={sendMove} chessSettings={chessSettings} />;
  }
  if (kind === "sudoku") return <SudokuLive snapshot={state} sendMove={sendMove} />;
  if (kind === "whot") return <WhotLive snapshot={state} sendMove={sendMove} />;
  if (kind === "ludo") return <LudoLive snapshot={state} sendMove={sendMove} />;

  return (
    <Card className="p-6 text-center">
      <p className="text-sm text-muted-foreground">Unsupported game.</p>
    </Card>
  );
}
