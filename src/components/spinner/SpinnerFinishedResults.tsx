"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { CompletionGraceBanner } from "@/components/activities/CompletionGraceBanner";
import type { SpinnerStateSnapshot } from "@/lib/spinner/types";

export function SpinnerFinishedResults({
  snapshot,
  banner,
}: {
  snapshot: SpinnerStateSnapshot;
  banner?: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      {banner}
      <CardTitle>{snapshot.title}</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Spinner session complete</p>
      {snapshot.spinHistory.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {snapshot.spinHistory
            .slice()
            .reverse()
            .map((spin) => (
              <li key={spin.id} className="rounded-xl bg-foreground/5 px-4 py-3">
                <span className="font-medium">{spin.username}</span>
                <span className="text-muted-foreground"> → </span>
                <span>{spin.selectedOption}</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No spins recorded.</p>
      )}
    </Card>
  );
}

export function SpinnerGraceResults({
  snapshot,
  graceRemainingMs,
}: {
  snapshot: SpinnerStateSnapshot;
  graceRemainingMs: number;
}) {
  return (
    <SpinnerFinishedResults
      snapshot={snapshot}
      banner={<CompletionGraceBanner remainingMs={graceRemainingMs} />}
    />
  );
}
