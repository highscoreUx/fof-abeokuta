"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { useEventNav } from "@/hooks/useEventNav";

export function AdminView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Event Admin" nav={nav}>
        <div className="grid gap-6 xl:grid-cols-2">
          <Leaderboard />
        </div>
      </AppShell>
    </RoleGuard>
  );
}
