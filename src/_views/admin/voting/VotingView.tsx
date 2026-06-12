"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { VotingPanel } from "@/components/voting/VotingPanel";

export function VotingView() {
  return (
    <PermissionGuard permission="vote.list" embedded>
      <VotingPanel admin />
    </PermissionGuard>
  );
}
