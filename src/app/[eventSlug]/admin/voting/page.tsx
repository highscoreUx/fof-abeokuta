"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { useEventNav } from "@/hooks/useEventNav";

export default function AdminVotingPage() {
  const { nav } = useEventNav();
  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Voting Admin" nav={nav}>
        <VotingPanel admin />
      </AppShell>
    </RoleGuard>
  );
}
