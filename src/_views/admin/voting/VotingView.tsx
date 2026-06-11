"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { useEventNav } from "@/hooks/useEventNav";

export function VotingView() {
  const { nav } = useEventNav();
  return (
    <PermissionGuard permission="vote.list">
      <AppShell title="Voting Admin" nav={nav}>
        <VotingPanel admin />
      </AppShell>
    </PermissionGuard>
  );
}
