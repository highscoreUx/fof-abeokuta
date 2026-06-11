"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { AgendaAdmin } from "@/components/admin/AgendaAdmin";
import { useEventNav } from "@/hooks/useEventNav";

export function AgendaView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Agenda" nav={nav}>
        <AgendaAdmin />
      </AppShell>
    </RoleGuard>
  );
}
