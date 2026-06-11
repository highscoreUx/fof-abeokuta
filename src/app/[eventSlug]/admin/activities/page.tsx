"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { useEventNav } from "@/hooks/useEventNav";

export default function AdminActivitiesPage() {
  const { nav } = useEventNav();
  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Activities" nav={nav}>
        <SpinToBuild admin />
      </AppShell>
    </RoleGuard>
  );
}
