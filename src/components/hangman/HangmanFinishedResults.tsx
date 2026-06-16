"use client";

import { HangmanBackground } from "@/components/hangman/HangmanBackground";
import { HangmanFigure } from "@/components/hangman/HangmanFigure";
import { HangmanKeyboard } from "@/components/hangman/HangmanKeyboard";
import { HangmanWordDisplay } from "@/components/hangman/HangmanWordDisplay";
import type { HangmanMatchSnapshot } from "@/lib/hangman/types";

interface HangmanFinishedResultsProps {
  snapshot: HangmanMatchSnapshot;
  graceRemainingMs?: number;
}

export function HangmanFinishedResults({
  snapshot,
  graceRemainingMs,
}: HangmanFinishedResultsProps) {
  const winner = snapshot.isSocial
    ? snapshot.winnerUserId === snapshot.playerX?.userId
      ? snapshot.teamX
      : snapshot.winnerUserId === snapshot.playerO?.userId
        ? snapshot.teamO
        : null
    : snapshot.winnerTeamId === snapshot.teamX.id
      ? snapshot.teamX
      : snapshot.winnerTeamId === snapshot.teamO.id
        ? snapshot.teamO
        : null;

  return (
    <HangmanBackground className="p-6 sm:p-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#5DA9EF]">Match over</p>
        <h3 className="mt-2 text-2xl font-black">{snapshot.challengeTitle}</h3>
        {winner && (
          <p className="mt-2 text-lg font-semibold" style={{ color: winner.color }}>
            {snapshot.isSocial ? `${winner.name} wins!` : `Team ${winner.letter} wins!`}
          </p>
        )}
        {snapshot.revealedWord && (
          <p className="mt-4 font-mono text-xl tracking-widest">{snapshot.revealedWord}</p>
        )}
        {graceRemainingMs != null && graceRemainingMs > 0 && (
          <p className="mt-4 text-sm text-white/70">
            Results visible for {Math.ceil(graceRemainingMs / 1000)}s
          </p>
        )}
      </div>
    </HangmanBackground>
  );
}
