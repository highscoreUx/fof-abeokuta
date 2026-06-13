"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { CompletionGraceBanner } from "@/components/activities/CompletionGraceBanner";
import { TicTacToeBoard } from "@/components/tic-tac-toe/TicTacToeBoard";
import type { TicTacToeMatchSnapshot } from "@/lib/tic-tac-toe/types";

function resultText(snapshot: TicTacToeMatchSnapshot) {
  if (snapshot.isDraw) return "Draw";
  const winner =
    snapshot.winnerTeamId === snapshot.teamX.id ? snapshot.teamX : snapshot.teamO;
  return `Team ${winner.letter} wins`;
}

export function TttFinishedResults({
  snapshot,
  banner,
}: {
  snapshot: TicTacToeMatchSnapshot;
  banner?: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      {banner}
      <CardTitle>{snapshot.challengeTitle}</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Team {snapshot.teamX.letter} vs Team {snapshot.teamO.letter} · {resultText(snapshot)}
      </p>
      <div className="mt-6">
        <TicTacToeBoard
          board={snapshot.board}
          currentTurn={snapshot.currentTurn}
          teamXColor={snapshot.teamX.color}
          teamOColor={snapshot.teamO.color}
          disabled
        />
      </div>
    </Card>
  );
}

export function TttGraceResults({
  snapshot,
  graceRemainingMs,
}: {
  snapshot: TicTacToeMatchSnapshot;
  graceRemainingMs: number;
}) {
  return (
    <TttFinishedResults
      snapshot={snapshot}
      banner={<CompletionGraceBanner remainingMs={graceRemainingMs} />}
    />
  );
}
