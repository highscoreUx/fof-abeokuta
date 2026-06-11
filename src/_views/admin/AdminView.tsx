"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { YouTubeEmbed } from "@/components/stage/YouTubeEmbed";
import { useEventNav } from "@/hooks/useEventNav";

export function AdminView() {
  const { nav } = useEventNav();

  return (
    <PermissionGuard permission="dashboard.view">
      <AppShell title="Dashboard" nav={nav}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <YouTubeEmbed />
          </div>
          <Leaderboard />
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
