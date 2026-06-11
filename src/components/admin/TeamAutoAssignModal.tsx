"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import type { TeamAssignAlgorithm, TeamAssignSettings } from "@/lib/team-assign";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

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

interface TeamAutoAssignModalProps {
  open: boolean;
  onClose: () => void;
  onMessage?: (msg: string) => void;
}

export function TeamAutoAssignModal({ open, onClose, onMessage }: TeamAutoAssignModalProps) {
  const { slug, api } = useEventApi();
  const [settings, setSettings] = useState<TeamAssignSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    api<{ settings: TeamAssignSettings }>("/settings/teams")
      .then((d) => setSettings(d.settings))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, [open, slug]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      const data = await api<{ settings: TeamAssignSettings }>("/settings/teams", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(data.settings);
      onMessage?.("Auto-assign settings saved.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!settings) return;
    setRunning(true);
    setError("");
    try {
      const result = await api<{ assigned: number }>("/users/assign-teams", {
        method: "POST",
        body: JSON.stringify({
          algorithm: settings.algorithm,
          onlyUnassigned: settings.onlyUnassigned,
        }),
      });
      onMessage?.(`Assigned ${result.assigned} participant(s) to teams.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run auto-assign");
    } finally {
      setRunning(false);
    }
  };

  const activeDescription = ALGORITHM_OPTIONS.find((o) => o.value === settings?.algorithm)
    ?.description;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Auto assign settings"
      description="Choose how participants are distributed across your teams."
      className="max-w-lg"
    >
      {loading && <p className="text-sm text-muted-foreground">Loading settings…</p>}

      {!loading && settings && (
        <div className="space-y-5">
          <div>
            <Label htmlFor="assign-algorithm">Algorithm</Label>
            <Select
              id="assign-algorithm"
              value={settings.algorithm}
              onChange={(e) =>
                setSettings((prev) =>
                  prev ? { ...prev, algorithm: e.target.value as TeamAssignAlgorithm } : prev,
                )
              }
              className="mt-1.5 w-full"
            >
              {ALGORITHM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {activeDescription && (
              <p className="mt-2 text-xs text-muted-foreground">{activeDescription}</p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={settings.autoAssignOnImport}
              onChange={(e) =>
                setSettings((prev) =>
                  prev ? { ...prev, autoAssignOnImport: e.target.checked } : prev,
                )
              }
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>Auto-assign new participants after CSV import</span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={settings.onlyUnassigned}
              onChange={(e) =>
                setSettings((prev) => (prev ? { ...prev, onlyUnassigned: e.target.checked } : prev))
              }
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>Only assign participants without a team (when running manually)</span>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className={cn("flex flex-wrap justify-end gap-2 pt-1")}>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={runNow} disabled={running || saving}>
              {running ? "Assigning…" : "Run now"}
            </Button>
            <Button type="button" onClick={saveSettings} disabled={saving || running}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      )}

      {!loading && !settings && error && <p className="text-sm text-danger">{error}</p>}
    </Modal>
  );
}
