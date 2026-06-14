"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import type { TeamAssignAlgorithm, TeamAssignSettings } from "@/lib/team-assign";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { toastError } from "@/lib/toast";

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
      description:
        "Cycle through teams in order (A → B → C …), continuing from the current team sizes.",
    },
    {
      value: "alphabetical_round_robin",
      label: "Alphabetical round robin",
      description:
        "Sort by last name, then cycle through teams evenly from the current team sizes.",
    },
    {
      value: "checked_in_balanced",
      label: "Check-in priority",
      description:
        "Checked-in participants first (earliest first), each placed on the smallest team.",
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
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLoadFailed(false);
    api<{ settings: TeamAssignSettings }>("/settings/teams")
      .then((d) => setSettings(d.settings))
      .catch((err) => {
        toastError(
          "Failed to load settings",
          err instanceof Error ? err.message : undefined,
        );
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [open, slug]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data = await api<{ settings: TeamAssignSettings }>("/settings/teams", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(data.settings);
      onMessage?.("Auto-assign settings saved.");
      onClose();
    } catch (err) {
      toastError(
        "Failed to save settings",
        err instanceof Error ? err.message : undefined,
      );
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
          includeStaff: settings.includeStaff,
        }),
      });
      onMessage?.(`Assigned ${result.assigned} user(s) to teams.`);
      onClose();
    } catch (err) {
      toastError(
        "Failed to run auto-assign",
        err instanceof Error ? err.message : undefined,
      );
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
            <span>Auto-assign new participants after CSV import (uses algorithm above)</span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={settings.includeStaff}
              onChange={(e) =>
                setSettings((prev) => (prev ? { ...prev, includeStaff: e.target.checked } : prev))
              }
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>Include staff when auto-assigning teams</span>
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
            <span>Only assign users without a team (when running manually)</span>
          </label>

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

      {!loading && !settings && loadFailed && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">Could not load settings.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              setLoadFailed(false);
              void api<{ settings: TeamAssignSettings }>("/settings/teams")
                .then((d) => setSettings(d.settings))
                .catch((err) => {
                  toastError(
                    "Failed to load settings",
                    err instanceof Error ? err.message : undefined,
                  );
                  setLoadFailed(true);
                })
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </Button>
        </div>
      )}
    </Modal>
  );
}
