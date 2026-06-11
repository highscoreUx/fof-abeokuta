"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { CheckInPanel } from "@/components/staff/CheckInPanel";
import { useEventNav } from "@/hooks/useEventNav";

export function CheckInView() {
  const { staffNav } = useEventNav();
  return (
    <RoleGuard minimumRole="STAFF">
      <AppShell title="Staff Check-in" nav={staffNav}>
        <CheckInPanel />
      </AppShell>
    </RoleGuard>
  );
}
