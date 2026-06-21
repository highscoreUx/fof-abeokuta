"use client";

import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialChessSettings } from "@/lib/chat-game-chess-settings";
import { DEFAULT_SOCIAL_CHESS_SETTINGS } from "@/lib/chat-game-chess-settings";
import type { SocialLudoSettings } from "@/lib/chat-game-ludo-settings";
import { DEFAULT_SOCIAL_LUDO_SETTINGS } from "@/lib/chat-game-ludo-settings";
import type { SocialWhotSettings } from "@/lib/chat-game-whot-settings";
import { DEFAULT_SOCIAL_WHOT_SETTINGS } from "@/lib/chat-game-whot-settings";
import type { SocialJsonGameKind } from "@/lib/social-games/kinds";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import type { ChessState } from "@/lib/social-games/game-state-types";
import { useSocialGameState } from "@/hooks/useSocialGameState";
import { WhotLive } from "@/components/social-games/WhotLive";
import { LudoLive } from "@/components/social-games/LudoLive";
import { SudokuLive } from "@/components/social-games/SudokuLive";
import { ChatGameResultHero } from "@/components/chat/ChatGameResultHero";
import { normalizeSudokuGrid } from "@/lib/social-games/sudoku-grid";
import type { SudokuState } from "@/lib/social-games/game-state-types";

interface SocialGameMatchLiveProps {
  matchId: string;
  kind: SocialJsonGameKind;
  sessionId?: string;
  chessSettings?: SocialChessSettings;
  ludoSettings?: SocialLudoSettings;
  whotSettings?: SocialWhotSettings;
  turnDeadlineAt?: number | null;
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

function findPendingSudokuCell(
  server: SocialGameMatchSnapshot | null,
  display: SocialGameMatchSnapshot | null,
  userId: string | undefined,
): number | null {
  if (!server || !display || !userId) return null;
  const serverGame = server.state as SudokuState;
  const displayGame = display.state as SudokuState;
  const puzzle = normalizeSudokuGrid(serverGame.puzzle);
  const serverBoard = normalizeSudokuGrid(serverGame.boards[userId] ?? puzzle);
  const displayBoard = normalizeSudokuGrid(displayGame.boards[userId] ?? puzzle);
  for (let index = 0; index < 81; index++) {
    if (serverBoard[index] !== displayBoard[index]) return index;
  }
  return null;
}

function findPendingChessSquares(
  server: SocialGameMatchSnapshot | null,
  display: SocialGameMatchSnapshot | null,
): Set<string> {
  const pending = new Set<string>();
  if (!server || !display) return pending;

  const serverFen = (server.state as ChessState).fen;
  const displayFen = (display.state as ChessState).fen;
  if (serverFen === displayFen) return pending;

  try {
    const chess = new Chess(serverFen);
    const displayBoard = parseFenBoard(displayFen);
    const serverBoard = parseFenBoard(serverFen);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (serverBoard[row]?.[col] !== displayBoard[row]?.[col]) {
          pending.add(squareName(row, col));
        }
      }
    }
    void chess;
  } catch {
    return pending;
  }

  return pending;
}

function ChessLive({
  snapshot,
  serverSnapshot,
  sendMove,
  chessSettings = DEFAULT_SOCIAL_CHESS_SETTINGS,
}: {
  snapshot: SocialGameMatchSnapshot;
  serverSnapshot: SocialGameMatchSnapshot | null;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
  chessSettings?: SocialChessSettings;
}) {
  const { user } = useAuth();
  const game = snapshot.state as ChessState;
  const board = useMemo(() => parseFenBoard(game.fen), [game.fen]);
  const pendingSquares = useMemo(
    () => findPendingChessSquares(serverSnapshot, snapshot),
    [serverSnapshot, snapshot],
  );
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
                const isPending = pendingSquares.has(square);
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
                    } ${isPending ? "bg-primary/15 opacity-80" : ""}`}
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

export function SocialGameMatchLive({
  matchId,
  kind,
  sessionId,
  chessSettings,
  ludoSettings,
  whotSettings,
  turnDeadlineAt,
}: SocialGameMatchLiveProps) {
  const { user } = useAuth();
  const { state, serverState, sendMove, movePending } = useSocialGameState(matchId, sessionId, {
    whotSettings,
  });

  const pendingSudokuCell = useMemo(
    () => findPendingSudokuCell(serverState, state, user?.id),
    [serverState, state, user?.id],
  );

  if (!state) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Connecting to game…</p>
      </Card>
    );
  }

  const finishedHero =
    state.status === "FINISHED" ? (
      <ChatGameResultHero
        eyebrow="Match over"
        title={
          state.winnerUserId
            ? `${playerName(state, state.winnerUserId)} wins!`
            : "Draw"
        }
        celebrate={Boolean(state.winnerUserId)}
      />
    ) : null;

  if (kind === "chess") {
    return (
      <div className="space-y-4">
        {finishedHero}
        <ChessLive
          snapshot={state}
          serverSnapshot={serverState}
          sendMove={sendMove}
          chessSettings={chessSettings}
        />
      </div>
    );
  }
  if (kind === "sudoku") {
    return (
      <div className="space-y-4">
        {finishedHero}
        <SudokuLive
          snapshot={state}
          sendMove={sendMove}
          pendingCellIndex={pendingSudokuCell}
        />
      </div>
    );
  }
  if (kind === "whot") {
    return (
      <div className="space-y-4">
        {finishedHero}
        <WhotLive
          snapshot={state}
          sendMove={sendMove}
          whotSettings={whotSettings ?? DEFAULT_SOCIAL_WHOT_SETTINGS}
          turnDeadlineAt={turnDeadlineAt}
        />
      </div>
    );
  }
  if (kind === "ludo") {
    return (
      <div className="space-y-4">
        {finishedHero}
        <LudoLive
          snapshot={state}
          sendMove={sendMove}
          ludoSettings={ludoSettings ?? DEFAULT_SOCIAL_LUDO_SETTINGS}
          turnDeadlineAt={turnDeadlineAt}
          movePending={movePending}
        />
      </div>
    );
  }

  return (
    <Card className="p-6 text-center">
      <p className="text-sm text-muted-foreground">Unsupported game.</p>
    </Card>
  );
}
