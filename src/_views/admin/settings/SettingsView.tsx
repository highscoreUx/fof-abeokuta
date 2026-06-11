"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { useEventNav } from "@/hooks/useEventNav";

export function SettingsView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Settings" nav={nav}>
        <div className="mx-auto max-w-4xl">
          <TeamSettings />
        </div>
      </AppShell>
    </RoleGuard>
  );
}
