"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { DiagnosticsPanel } from "@/components/admin/DiagnosticsPanel";
import { useEventNav } from "@/hooks/useEventNav";

export function DiagnosticsView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Diagnostics" nav={nav}>
        <DiagnosticsPanel />
      </AppShell>
    </RoleGuard>
  );
}
