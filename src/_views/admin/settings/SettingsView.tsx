"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { ChatSettings } from "@/components/admin/ChatSettings";
import { DiagnosticsPanel } from "@/components/admin/DiagnosticsPanel";
import { StreamControls } from "@/components/admin/StreamControls";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEventNav } from "@/hooks/useEventNav";

type SettingsTab = "teams" | "chat" | "broadcasting" | "diagnostics";

const TAB_OPTIONS: Array<{ value: SettingsTab; label: string }> = [
  { value: "teams", label: "Teams" },
  { value: "chat", label: "Chat" },
  { value: "broadcasting", label: "Broadcasting" },
  { value: "diagnostics", label: "Diagnostics" },
];

function parseTab(value: string | null): SettingsTab {
  if (value === "chat" || value === "broadcasting" || value === "diagnostics" || value === "teams") {
    return value;
  }
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
    <PermissionGuard
      anyOf={[
        "team.list",
        "team.manage",
        "settings.broadcasting",
        "settings.diagnostics",
      ]}
    >
      <AppShell title="Event settings" nav={nav}>
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Configure your event</CardTitle>
                <CardDescription>
                  Teams, chat, broadcasting, and diagnostics. Account permissions are managed when
                  users are created.
                </CardDescription>
              </div>
              <SegmentedControl
                value={tab}
                onChange={setTab}
                options={TAB_OPTIONS}
                className="w-full sm:max-w-3xl"
              />
            </CardHeader>
          </Card>

          {tab === "teams" && <TeamSettings />}
          {tab === "chat" && <ChatSettings />}
          {tab === "broadcasting" && <StreamControls />}
          {tab === "diagnostics" && <DiagnosticsPanel />}
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
