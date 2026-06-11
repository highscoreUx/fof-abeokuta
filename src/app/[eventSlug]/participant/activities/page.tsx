"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { useEventNav } from "@/hooks/useEventNav";

export default function ParticipantActivitiesPage() {
  const { participantNav } = useEventNav();
  return (
    <RoleGuard minimumRole="PARTICIPANT">
      <AppShell title="Activities" nav={participantNav} showSponsors>
        <div className="space-y-6">
          <SpinToBuild />
          <QuizPlayer />
        </div>
      </AppShell>
    </RoleGuard>
  );
}
