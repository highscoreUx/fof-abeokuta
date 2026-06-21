"use client";

import { HangmanBackground } from "@/components/hangman/HangmanBackground";
import { ChatGameResultHero } from "@/components/chat/ChatGameResultHero";
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

  const winnerLabel = winner
    ? snapshot.isSocial
      ? `${winner.name} wins!`
      : `Team ${winner.letter} wins!`
    : "Match over";

  return (
    <div className="space-y-4">
      <ChatGameResultHero
        eyebrow="Match over"
        title={winnerLabel}
        subtitle={snapshot.challengeTitle}
        celebrate={Boolean(winner)}
      />
      <HangmanBackground className="p-6 sm:p-8">
        <div className="text-center">
          {snapshot.revealedWord && (
            <p className="font-mono text-xl tracking-widest">{snapshot.revealedWord}</p>
          )}
          {graceRemainingMs != null && graceRemainingMs > 0 && (
            <p className="mt-4 text-sm text-white/70">
              Results visible for {Math.ceil(graceRemainingMs / 1000)}s
            </p>
          )}
        </div>
      </HangmanBackground>
    </div>
  );
}
