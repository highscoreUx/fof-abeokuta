"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { QuizAdmin } from "@/components/quiz/QuizAdmin";
import { useEventNav } from "@/hooks/useEventNav";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";
import { hasPermission } from "@/lib/permissions";

export function GamesView() {
  const { nav } = useEventNav();
  const permissions = useAuthStore(selectUserPermissions);
  const canManageQuiz = hasPermission(permissions, "quiz.manage");
  const canManageSpin = hasPermission(permissions, "spin.manage");

  return (
    <PermissionGuard anyOf={["quiz.manage", "spin.manage"]}>
      <AppShell title="Activities" nav={nav}>
        <div className="space-y-6">
          {canManageQuiz && <QuizAdmin />}
          {canManageSpin && <SpinToBuild admin />}
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
