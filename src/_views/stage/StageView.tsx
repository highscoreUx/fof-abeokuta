"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { YouTubeEmbed } from "@/components/stage/YouTubeEmbed";
import { CountdownStageDisplay } from "@/components/countdown/CountdownStageDisplay";
import { QuizStageDisplay } from "@/components/quiz/QuizStageDisplay";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { useAuth } from "@/hooks/useAuth";
import { useEventNav } from "@/hooks/useEventNav";
import { hasAdminShellAccess, hasPermission, resolveDefaultRoute } from "@/lib/permissions";

export function StageView() {
  const { pathPrefix, stage } = useEventNav();
  const { user } = useAuth();

  const backHref = user ? resolveDefaultRoute(user.permissions, pathPrefix) : pathPrefix;
  const backLabel = user
    ? hasAdminShellAccess(user.permissions)
      ? "Home"
      : hasPermission(user.permissions, "user.check_in")
        ? "Check In"
        : hasPermission(user.permissions, "score.submit")
          ? "Scoring"
          : "Home"
    : "Home";

  const nav = [
    { href: backHref, label: backLabel },
    { href: stage, label: "Main Stage" },
  ];

  return (
    <PermissionGuard permission="stage.view">
      <AppShell
        title="Main Stage"
        nav={nav}
        showSponsors={user ? hasPermission(user.permissions, "participant.home") : false}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <CountdownStageDisplay variant="stage" />
            <QuizStageDisplay variant="stage" />
            <YouTubeEmbed />
          </div>
          <Leaderboard />
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
