"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { UserImport } from "@/components/admin/UserImport";
import { StreamControls } from "@/components/admin/StreamControls";
import { LoginSlideAdmin } from "@/components/admin/LoginSlideAdmin";
import { DiagnosticsPanel } from "@/components/admin/DiagnosticsPanel";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { AgendaAdmin } from "@/components/admin/AgendaAdmin";
import { useEventNav } from "@/hooks/useEventNav";

export function AdminView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Event Admin" nav={nav}>
        <div className="grid gap-6 lg:grid-cols-2">
          <DiagnosticsPanel />
          <StreamControls />
          <LoginSlideAdmin />
          <Leaderboard />
          <UserImport />
          <AgendaAdmin />
        </div>
      </AppShell>
    </RoleGuard>
  );
}
