"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { LoginSlideAdmin } from "@/components/admin/LoginSlideAdmin";
import { useEventNav } from "@/hooks/useEventNav";

export function SettingsView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Settings" nav={nav}>
        <div className="space-y-6">
          <TeamSettings />
          <LoginSlideAdmin />
        </div>
      </AppShell>
    </RoleGuard>
  );
}
