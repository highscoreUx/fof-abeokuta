"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { StreamControls } from "@/components/admin/StreamControls";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEventNav } from "@/hooks/useEventNav";

type SettingsTab = "teams" | "voting" | "broadcasting";

const TAB_OPTIONS: Array<{ value: SettingsTab; label: string }> = [
  { value: "teams", label: "Teams" },
  { value: "voting", label: "Voting" },
  { value: "broadcasting", label: "Broadcasting" },
];

function parseTab(value: string | null): SettingsTab {
  if (value === "voting" || value === "broadcasting" || value === "teams") return value;
  return "teams";
}

export function SettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { nav, settings: settingsPath } = useEventNav();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: SettingsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "teams") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(`${settingsPath}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, searchParams, settingsPath],
  );

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Event settings" nav={nav}>
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Configure your event</CardTitle>
                <CardDescription>
                  Manage teams, voting sessions, and the live broadcast from one place.
                </CardDescription>
              </div>
              <SegmentedControl
                value={tab}
                onChange={setTab}
                options={TAB_OPTIONS}
                className="w-full sm:max-w-xl"
              />
            </CardHeader>
          </Card>

          {tab === "teams" && <TeamSettings />}
          {tab === "voting" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create polls and open or close voting for participants.
              </p>
              <VotingPanel admin />
            </div>
          )}
          {tab === "broadcasting" && <StreamControls />}
        </div>
      </AppShell>
    </RoleGuard>
  );
}
