"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { useEventNav } from "@/hooks/useEventNav";
import { hasAdminShellAccess } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";

export function ParticipantActivitiesView() {
  const { nav, participantNav } = useEventNav();
  const { user } = useAuth();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;

  return (
    <PermissionGuard permission="participant.activities" allowAdminShell>
      <AppShell title="Activities" nav={shellNav}>
        <div className="space-y-6">
          <SpinToBuild />
          <QuizPlayer />
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
