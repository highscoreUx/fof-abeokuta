"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { CheckInPanel } from "@/components/staff/CheckInPanel";
import { useEventNav } from "@/hooks/useEventNav";

export function CheckInView() {
  const { staffNav } = useEventNav();
  return (
    <PermissionGuard permission="user.check_in">
      <AppShell title="Staff Check-in" nav={staffNav}>
        <CheckInPanel />
      </AppShell>
    </PermissionGuard>
  );
}
