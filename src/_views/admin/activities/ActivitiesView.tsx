"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { useEventNav } from "@/hooks/useEventNav";

export function ActivitiesView() {
  const { nav } = useEventNav();
  return (
    <PermissionGuard anyOf={["quiz.manage", "spin.manage"]}>
      <AppShell title="Activities" nav={nav}>
        <SpinToBuild admin />
      </AppShell>
    </PermissionGuard>
  );
}
