"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { QuizAdmin } from "@/components/quiz/QuizAdmin";
import { useEventNav } from "@/hooks/useEventNav";

export function QuizView() {
  const { nav } = useEventNav();
  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Quiz Admin" nav={nav}>
        <QuizAdmin />
      </AppShell>
    </RoleGuard>
  );
}
