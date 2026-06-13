"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ChatSettings } from "@/components/admin/ChatSettings";
import { StreamControls } from "@/components/admin/StreamControls";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEventNav } from "@/hooks/useEventNav";
import { useEventSettings } from "@/hooks/useEventSettings";

type SettingsTab = "teams" | "chat" | "broadcasting";

function parseTab(value: string | null, teamingEnabled: boolean): SettingsTab {
  if (value === "chat" || value === "broadcasting") return value;
  if (value === "teams" && teamingEnabled) return "teams";
  return teamingEnabled ? "teams" : "chat";
}

export function SettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings: settingsPath } = useEventNav();
  const { teamingEnabled, loading } = useEventSettings();
  const tab = parseTab(searchParams.get("tab"), teamingEnabled);

  const tabOptions = useMemo(() => {
    const options: Array<{ value: SettingsTab; label: string }> = [];
    if (teamingEnabled) options.push({ value: "teams", label: "Teams" });
    options.push({ value: "chat", label: "Chat" });
    options.push({ value: "broadcasting", label: "Broadcasting" });
    return options;
  }, [teamingEnabled]);

  useEffect(() => {
    if (loading) return;
    if (!teamingEnabled && tab === "teams") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "chat");
      router.replace(`${settingsPath}?${params.toString()}`, { scroll: false });
    }
  }, [loading, teamingEnabled, tab, router, searchParams, settingsPath]);

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
    <PermissionGuard anyOf={["team.list", "team.manage", "settings.broadcasting"]} embedded>
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Configure your event</CardTitle>
              <CardDescription>
                {teamingEnabled
                  ? "Teams, chat, and broadcasting. Account permissions are managed when users are created."
                  : "Chat and broadcasting. Teaming is disabled for this event in platform settings."}
              </CardDescription>
            </div>
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={tabOptions}
              className="w-full sm:max-w-3xl"
            />
          </CardHeader>
        </Card>

        {tab === "teams" && teamingEnabled && <TeamSettings />}
        {tab === "chat" && <ChatSettings teamingEnabled={teamingEnabled} />}
        {tab === "broadcasting" && <StreamControls />}
      </div>
    </PermissionGuard>
  );
}
