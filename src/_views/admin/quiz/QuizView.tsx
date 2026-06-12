"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { QuizAdmin } from "@/components/quiz/QuizAdmin";

export function QuizView() {
  return (
    <PermissionGuard permission="quiz.manage" embedded>
      <QuizAdmin />
    </PermissionGuard>
  );
}
