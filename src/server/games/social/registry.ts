import type { SocialJsonGameKind } from "@/lib/social-games/kinds";
import { createChessState, applyChessMove, chessTurnColor } from "@/server/games/social/games/chess";
import {
  createLudoState,
  rollLudoDice,
  applyLudoMove,
  nextLudoPlayer,
  ludoHasLegalMove,
  parseLudoDieChoice,
  passLudoTurn,
  resolveLudoTurnAfterMove,
} from "@/server/games/social/games/ludo";
import { prepareLudoStateForPlay } from "@/lib/social-games/ludo-helpers";
import type { LudoState } from "@/lib/social-games/game-state-types";
import { createSudokuState, applySudokuCell, applySudokuPencil } from "@/server/games/social/games/sudoku";
import {
  createWhotState,
  applyWhotPlay,
  applyWhotDraw,
  nextWhotPlayer,
  type WhotShape,
} from "@/server/games/social/games/whot";

export interface SocialGameInitContext {
  playerIds: string[];
  settings: Record<string, unknown>;
}

export interface SocialGameMoveContext {
  userId: string;
  action: string;
  payload: Record<string, unknown>;
  playerIds: string[];
  seatByUserId: Record<string, string>;
}

export interface SocialGameMoveResult {
  state: unknown;
  winnerUserId: string | null;
  nextTurnUserId: string | null;
  isDraw?: boolean;
  error?: string;
}

export interface SocialGameHandler {
  createInitialState: (ctx: SocialGameInitContext) => unknown;
  getFirstTurnUserId: (state: unknown, playerIds: string[]) => string | null;
  applyMove: (state: unknown, ctx: SocialGameMoveContext) => SocialGameMoveResult;
}

function seatToChessColor(seat: string): "w" | "b" {
  return seat === "0" || seat === "X" ? "w" : "b";
}

const chessHandler: SocialGameHandler = {
  createInitialState: () => createChessState(),
  getFirstTurnUserId: (_state, playerIds) => playerIds[0] ?? null,
  applyMove: (state, ctx) => {
    const s = state as ReturnType<typeof createChessState>;
    const from = String(ctx.payload.from ?? "");
    const to = String(ctx.payload.to ?? "");
    const promotion = ctx.payload.promotion ? String(ctx.payload.promotion) : undefined;
    const result = applyChessMove(s, from, to, promotion);
    if (result.error) {
      return { state: s, winnerUserId: null, nextTurnUserId: null, error: result.error };
    }

    const turn = chessTurnColor(result.state.fen);
    const nextTurnUserId =
      Object.entries(ctx.seatByUserId).find(
        ([, seat]) => seatToChessColor(seat) === turn,
      )?.[0] ?? null;

    let winnerUserId = result.winnerUserId;
    if (winnerUserId === "pending") {
      winnerUserId = ctx.userId;
    }

    return {
      state: result.state,
      winnerUserId,
      nextTurnUserId: winnerUserId || result.isDraw ? null : nextTurnUserId,
      isDraw: result.isDraw,
    };
  },
};

const sudokuHandler: SocialGameHandler = {
  createInitialState: () => createSudokuState(),
  getFirstTurnUserId: () => null,
  applyMove: (state, ctx) => {
    const s = state as ReturnType<typeof createSudokuState>;

    if (ctx.action === "pencil") {
      const index = Number(ctx.payload.index);
      const value = Number(ctx.payload.value);
      const result = applySudokuPencil(s, ctx.userId, index, value);
      if (result.error) {
        return { state: s, winnerUserId: null, nextTurnUserId: null, error: result.error };
      }
      return { state: result.state, winnerUserId: null, nextTurnUserId: null };
    }

    const index = Number(ctx.payload.index);
    const value = Number(ctx.payload.value);
    const result = applySudokuCell(s, ctx.userId, index, value);
    if (result.error) {
      return { state: s, winnerUserId: null, nextTurnUserId: null, error: result.error };
    }
    return {
      state: result.state,
      winnerUserId: result.winnerUserId,
      nextTurnUserId: null,
    };
  },
};

const whotHandler: SocialGameHandler = {
  createInitialState: (ctx) => createWhotState(ctx.playerIds),
  getFirstTurnUserId: (_state, playerIds) => playerIds[0] ?? null,
  applyMove: (state, ctx) => {
    const s = state as ReturnType<typeof createWhotState>;
    if (ctx.action === "draw") {
      const draw = applyWhotDraw(s, ctx.userId);
      if (draw.error) {
        return { state: s, winnerUserId: null, nextTurnUserId: null, error: draw.error };
      }
      const next = nextWhotPlayer(draw.state, ctx.userId);
      return { state: draw.state, winnerUserId: null, nextTurnUserId: next };
    }

    const cardId = String(ctx.payload.cardId ?? "");
    const chosenShape = ctx.payload.shape as WhotShape | undefined;
    const play = applyWhotPlay(s, ctx.userId, cardId, chosenShape);
    if (play.error) {
      return { state: s, winnerUserId: null, nextTurnUserId: null, error: play.error };
    }
    const next = play.winnerUserId ? null : nextWhotPlayer(play.state, ctx.userId);
    return { state: play.state, winnerUserId: play.winnerUserId, nextTurnUserId: next };
  },
};

const ludoHandler: SocialGameHandler = {
  createInitialState: (ctx) => createLudoState(ctx.playerIds),
  getFirstTurnUserId: (_state, playerIds) => playerIds[0] ?? null,
  applyMove: (state, ctx) => {
    const s = prepareLudoStateForPlay(state, ctx.playerIds) as LudoState;

    if (ctx.action === "pass") {
      if (s.dice == null) {
        return { state: s, winnerUserId: null, nextTurnUserId: ctx.userId, error: "Nothing to pass." };
      }
      if (ludoHasLegalMove(s, ctx.userId)) {
        return { state: s, winnerUserId: null, nextTurnUserId: ctx.userId, error: "You have a legal move." };
      }
      return {
        state: passLudoTurn(s, ctx.userId),
        winnerUserId: null,
        nextTurnUserId: nextLudoPlayer(s, ctx.userId),
      };
    }

    if (ctx.action === "roll") {
      if (s.dice != null) {
        return { state: s, winnerUserId: null, nextTurnUserId: ctx.userId, error: "Already rolled." };
      }
      const rolled = rollLudoDice(s, ctx.userId);
      if (!ludoHasLegalMove(rolled, ctx.userId)) {
        return {
          state: passLudoTurn(rolled, ctx.userId),
          winnerUserId: null,
          nextTurnUserId: nextLudoPlayer(rolled, ctx.userId),
        };
      }
      return { state: rolled, winnerUserId: null, nextTurnUserId: ctx.userId };
    }

    const pieceId = Number(ctx.payload.pieceId);
    const dieChoice = parseLudoDieChoice(ctx.payload.dieChoice);
    if (dieChoice == null) {
      return {
        state: s,
        winnerUserId: null,
        nextTurnUserId: ctx.userId,
        error: "Choose which die to use.",
      };
    }

    const initialRoll = s.dice!;
    const move = applyLudoMove(s, ctx.userId, pieceId, dieChoice);
    if (move.error) {
      return { state: s, winnerUserId: null, nextTurnUserId: ctx.userId, error: move.error };
    }

    const resolved = resolveLudoTurnAfterMove(
      move.state,
      ctx.userId,
      initialRoll,
      move.winnerUserId,
    );

    return {
      state: resolved.state,
      winnerUserId: move.winnerUserId,
      nextTurnUserId: resolved.nextTurnUserId,
    };
  },
};

export const SOCIAL_GAME_HANDLERS: Record<SocialJsonGameKind, SocialGameHandler> = {
  chess: chessHandler,
  sudoku: sudokuHandler,
  whot: whotHandler,
  ludo: ludoHandler,
};

export function getSocialGameHandler(kind: string): SocialGameHandler | null {
  return SOCIAL_GAME_HANDLERS[kind as SocialJsonGameKind] ?? null;
}
