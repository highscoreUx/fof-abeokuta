"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventNav } from "@/hooks/useEventNav";

export function SettingsView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Settings" nav={nav}>
        <div className="mx-auto max-w-4xl space-y-6">
          <TeamSettings />
          <Card>
            <CardHeader>
              <CardTitle>Voting</CardTitle>
              <CardDescription>
                Configure polls and voting sessions for this event.
              </CardDescription>
            </CardHeader>
            <VotingPanel admin />
          </Card>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
