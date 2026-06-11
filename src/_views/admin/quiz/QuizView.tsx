"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { QuizAdmin } from "@/components/quiz/QuizAdmin";
import { useEventNav } from "@/hooks/useEventNav";

export function QuizView() {
  const { nav } = useEventNav();
  return (
    <PermissionGuard permission="quiz.manage">
      <AppShell title="Quiz Admin" nav={nav}>
        <QuizAdmin />
      </AppShell>
    </PermissionGuard>
  );
}
