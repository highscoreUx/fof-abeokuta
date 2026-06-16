"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { CompletionGraceBanner } from "@/components/activities/CompletionGraceBanner";
import { TicTacToeBoard } from "@/components/tic-tac-toe/TicTacToeBoard";
import { cn } from "@/lib/cn";
import type { TicTacToeMatchSnapshot } from "@/lib/tic-tac-toe/types";

function resultText(snapshot: TicTacToeMatchSnapshot) {
  if (snapshot.isDraw) return "Draw";
  if (snapshot.isSocial && snapshot.winnerUserId) {
    const winner =
      snapshot.winnerUserId === snapshot.playerX?.userId
        ? snapshot.playerX
        : snapshot.playerO;
    return winner ? `${winner.firstName} wins` : "Finished";
  }
  const winner =
    snapshot.winnerTeamId === snapshot.teamX.id ? snapshot.teamX : snapshot.teamO;
  return `Team ${winner.letter} wins`;
}

function matchupLabel(snapshot: TicTacToeMatchSnapshot) {
  if (snapshot.isSocial) {
    const x = snapshot.playerX?.firstName ?? "Player X";
    const o = snapshot.playerO?.firstName ?? "Player O";
    return `${x} vs ${o}`;
  }
  return `Team ${snapshot.teamX.letter} vs Team ${snapshot.teamO.letter}`;
}

export function TttFinishedResults({
  snapshot,
  banner,
  hideTitle = false,
}: {
  snapshot: TicTacToeMatchSnapshot;
  banner?: React.ReactNode;
  hideTitle?: boolean;
}) {
  return (
    <Card className="p-6">
      {banner}
      {!hideTitle && <CardTitle>{snapshot.challengeTitle}</CardTitle>}
      <p className={cn("text-sm text-muted-foreground", !hideTitle && "mt-1")}>
        {matchupLabel(snapshot)} · {resultText(snapshot)}
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
  hideTitle = false,
}: {
  snapshot: TicTacToeMatchSnapshot;
  graceRemainingMs: number;
  hideTitle?: boolean;
}) {
  return (
    <TttFinishedResults
      snapshot={snapshot}
      hideTitle={hideTitle}
      banner={<CompletionGraceBanner remainingMs={graceRemainingMs} />}
    />
  );
}
