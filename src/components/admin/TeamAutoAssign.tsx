"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import type { TeamAssignAlgorithm, TeamAssignSettings } from "@/lib/team-assign";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

const ALGORITHM_OPTIONS: Array<{ value: TeamAssignAlgorithm; label: string; description: string }> =
  [
    {
      value: "balanced_random",
      label: "Balanced random",
      description: "Shuffle participants, then place each person on the smallest team.",
    },
    {
      value: "round_robin",
      label: "Round robin",
      description: "Walk through teams in order (by team code) as participants are listed.",
    },
    {
      value: "alphabetical_round_robin",
      label: "Alphabetical round robin",
      description: "Sort by name, then cycle through teams evenly.",
    },
    {
      value: "checked_in_balanced",
      label: "Check-in priority",
      description: "Checked-in participants first (earliest first), balanced across teams.",
    },
    {
      value: "random",
      label: "Pure random",
      description: "Random team per participant. Fast, but teams may end up uneven.",
    },
  ];

export function TeamAutoAssign({ onMessage }: { onMessage: (msg: string) => void }) {
  const { slug, api } = useEventApi();
  const [settings, setSettings] = useState<TeamAssignSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api<{ settings: TeamAssignSettings }>("/settings/teams").then((d) => setSettings(d.settings));
  }, [slug]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data = await api<{ settings: TeamAssignSettings }>("/settings/teams", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(data.settings);
      onMessage("Auto-assign settings saved.");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!settings) return;
    setRunning(true);
    try {
      const result = await api<{ assigned: number }>("/users/assign-teams", {
        method: "POST",
        body: JSON.stringify({
          algorithm: settings.algorithm,
          onlyUnassigned: settings.onlyUnassigned,
        }),
      });
      onMessage(`Assigned ${result.assigned} participant(s) to teams.`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to run auto-assign");
    } finally {
      setRunning(false);
    }
  };

  if (!settings) {
    return (
      <Card>
        <CardTitle>Auto-assign teams</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Auto-assign teams</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose how participants are distributed. FIGMA events typically use five teams (F, I, G, M,
        A), but any team setup works.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-foreground">Algorithm</label>
        <select
          value={settings.algorithm}
          onChange={(e) =>
            setSettings((prev) =>
              prev ? { ...prev, algorithm: e.target.value as TeamAssignAlgorithm } : prev,
            )
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {ALGORITHM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {ALGORITHM_OPTIONS.find((o) => o.value === settings.algorithm)?.description}
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoAssignOnImport}
            onChange={(e) =>
              setSettings((prev) =>
                prev ? { ...prev, autoAssignOnImport: e.target.checked } : prev,
              )
            }
          />
          Auto-assign new participants after CSV import
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.onlyUnassigned}
            onChange={(e) =>
              setSettings((prev) => (prev ? { ...prev, onlyUnassigned: e.target.checked } : prev))
            }
          />
          Only assign participants without a team (when running manually)
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving…" : "Save auto-assign settings"}
        </Button>
        <Button variant="secondary" onClick={runNow} disabled={running}>
          {running ? "Assigning…" : "Run auto-assign now"}
        </Button>
      </div>
    </Card>
  );
}
