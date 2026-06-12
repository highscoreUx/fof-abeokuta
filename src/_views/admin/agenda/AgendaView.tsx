"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AgendaAdmin } from "@/components/admin/AgendaAdmin";

export function AgendaView() {
  return (
    <PermissionGuard permission="agenda.list" embedded>
      <AgendaAdmin />
    </PermissionGuard>
  );
}
