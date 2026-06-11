"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { AgendaAdmin } from "@/components/admin/AgendaAdmin";
import { useEventNav } from "@/hooks/useEventNav";

export function AgendaView() {
  const { nav } = useEventNav();

  return (
    <PermissionGuard permission="agenda.list">
      <AppShell title="Agenda" nav={nav}>
        <AgendaAdmin />
      </AppShell>
    </PermissionGuard>
  );
}
