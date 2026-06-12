"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useEventApi } from "@/hooks/useEventApi";
import { formatInstanceScope } from "@/lib/activities/catalog";
import type { SpinnerParticipationMode } from "@/lib/spinner/types";

interface SpinnerDetail {
  id: string;
  title: string;
  config: { options?: string[] };
  participationMode: SpinnerParticipationMode;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  activeSessionId?: string | null;
}

interface SpinnerConfigurePanelProps {
  spinnerId: string;
  onReload?: () => void;
}

export function SpinnerConfigurePanel({ spinnerId, onReload }: SpinnerConfigurePanelProps) {
  const { api } = useEventApi();
  const [spinner, setSpinner] = useState<SpinnerDetail | null>(null);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [participationMode, setParticipationMode] = useState<SpinnerParticipationMode>("ONE_AT_A_TIME");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ challenge: SpinnerDetail }>(`/spin-challenges/${spinnerId}`);
      setSpinner(data.challenge);
      const opts = Array.isArray(data.challenge.config?.options)
        ? data.challenge.config.options
        : [];
      setOptions(opts.length >= 2 ? opts : ["", ""]);
      setParticipationMode(data.challenge.participationMode ?? "ONE_AT_A_TIME");
    } catch {
      setError("Spinner not found.");
    } finally {
      setLoading(false);
    }
  }, [api, spinnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const save = async () => {
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      setError("Add at least two wheel options.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api(`/spin-challenges/${spinnerId}`, {
        method: "PATCH",
        body: JSON.stringify({ options: cleaned, participationMode }),
      });
      await load();
      await onReload?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!spinner) return <p className="text-danger">{error ?? "Not found"}</p>;

  const scope = formatInstanceScope({
    allowGeneralParticipants: spinner.allowGeneralParticipants,
    allowGroupParticipants: spinner.allowGroupParticipants,
  });

  return (
    <Card className="w-full p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{spinner.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Spinner · {scope}
          {spinner.activeSessionId ? " · Live session active" : ""}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Participation</label>
          <Select
            className="w-full max-w-xs"
            value={participationMode}
            onChange={(e) => setParticipationMode(e.target.value as SpinnerParticipationMode)}
          >
            <option value="ONE_AT_A_TIME">One person at a time (spectators watch)</option>
            <option value="CONCURRENT">Anyone can spin</option>
          </Select>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Wheel options</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Participants spin to pick one of these at random.
          </p>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => removeOption(i)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
          {options.length < 12 && (
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={addOption}>
              Add option
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save configuration"}
        </Button>
      </div>
    </Card>
  );
}
