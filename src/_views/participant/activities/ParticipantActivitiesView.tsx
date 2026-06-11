"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { useEventNav } from "@/hooks/useEventNav";

export function ParticipantActivitiesView() {
  const { participantNav } = useEventNav();
  return (
    <PermissionGuard permission="participant.activities">
      <AppShell title="Activities" nav={participantNav}>
        <div className="space-y-6">
          <SpinToBuild />
          <QuizPlayer />
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
