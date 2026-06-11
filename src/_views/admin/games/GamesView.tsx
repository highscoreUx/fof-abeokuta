"use client";

import { useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { QuizAdmin } from "@/components/quiz/QuizAdmin";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEventNav } from "@/hooks/useEventNav";

type GamesTab = "quiz" | "activities";

export function GamesView() {
  const { nav } = useEventNav();
  const [tab, setTab] = useState<GamesTab>("quiz");

  return (
    <PermissionGuard anyOf={["quiz.manage", "spin.manage"]}>
      <AppShell title="Games & Activities" nav={nav}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Run event games</CardTitle>
              <CardDescription>
                Manage quizzes and live activities for participants from one place.
              </CardDescription>
            </CardHeader>
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: "quiz", label: "Quiz" },
                { value: "activities", label: "Activities & games" },
              ]}
            />
          </Card>

          {tab === "quiz" ? <QuizAdmin /> : <SpinToBuild admin />}
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
