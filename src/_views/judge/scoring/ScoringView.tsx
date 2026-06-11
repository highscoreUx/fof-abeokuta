"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { JudgeScoring } from "@/components/judge/JudgeScoring";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { useEventNav } from "@/hooks/useEventNav";

export function ScoringView() {
  const { judgeNav } = useEventNav();
  return (
    <PermissionGuard permission="score.submit">
      <AppShell title="Judge Scoring" nav={judgeNav}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <JudgeScoring />
          </div>
          <Leaderboard />
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
