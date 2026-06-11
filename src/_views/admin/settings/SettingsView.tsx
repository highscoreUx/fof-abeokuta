"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { StreamControls } from "@/components/admin/StreamControls";
import { LoginSlideAdmin } from "@/components/admin/LoginSlideAdmin";
import { useEventNav } from "@/hooks/useEventNav";

export function SettingsView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Settings" nav={nav}>
        <div className="grid gap-6 lg:grid-cols-2">
          <TeamSettings />
          <StreamControls />
          <LoginSlideAdmin />
        </div>
      </AppShell>
    </RoleGuard>
  );
}
