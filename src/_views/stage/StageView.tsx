"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { YouTubeEmbed } from "@/components/stage/YouTubeEmbed";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { useAuth } from "@/hooks/useAuth";
import { useEventNav } from "@/hooks/useEventNav";

export function StageView() {
  const { admin, staffCheckIn, judgeScoring, participant, stage } = useEventNav();
  const { user } = useAuth();

  const nav = [
    ...(user?.role === "ADMIN"
      ? [{ href: admin, label: "Admin" }]
      : user?.role === "STAFF"
        ? [{ href: staffCheckIn, label: "Check In" }]
        : user?.role === "JUDGE"
          ? [{ href: judgeScoring, label: "Scoring" }]
          : [{ href: participant, label: "Home" }]),
    { href: stage, label: "Main Stage" },
  ];

  return (
    <RoleGuard minimumRole="PARTICIPANT">
      <AppShell title="Main Stage" nav={nav} showSponsors={user?.role === "PARTICIPANT"}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <YouTubeEmbed />
          </div>
          <Leaderboard />
        </div>
      </AppShell>
    </RoleGuard>
  );
}
