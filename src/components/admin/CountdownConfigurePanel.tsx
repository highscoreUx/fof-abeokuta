"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEventApi } from "@/hooks/useEventApi";
import { formatDurationLabel, parseDurationInput } from "@/lib/countdown/format";
import { formatInstanceScope } from "@/lib/activities/catalog";
import { toastError } from "@/lib/toast";

interface CountdownDetail {
  id: string;
  title: string;
  durationSec: number;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  activeSessionId?: string | null;
  activeSessionState?: string | null;
}

interface CountdownConfigurePanelProps {
  countdownId: string;
  onReload?: () => void;
}

export function CountdownConfigurePanel({
  countdownId,
  onReload,
}: CountdownConfigurePanelProps) {
  const { api } = useEventApi();
  const [countdown, setCountdown] = useState<CountdownDetail | null>(null);
  const [durationInput, setDurationInput] = useState("5:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ challenge: CountdownDetail }>(
        `/countdown-challenges/${countdownId}`,
      );
      setCountdown(data.challenge);
      const minutes = Math.floor(data.challenge.durationSec / 60);
      const seconds = data.challenge.durationSec % 60;
      setDurationInput(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    } catch {
      toastError("Failed to load countdown", "Countdown not found.");
    } finally {
      setLoading(false);
    }
  }, [api, countdownId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const durationSec = parseDurationInput(durationInput);
    if (durationSec == null) {
      toastError("Invalid duration", "Use M:SS or total seconds (e.g. 5:00 or 300).");
      return;
    }

    setSaving(true);
    try {
      await api(`/countdown-challenges/${countdownId}`, {
        method: "PATCH",
        body: JSON.stringify({ durationSec }),
      });
      await load();
      await onReload?.();
    } catch (e) {
      toastError("Failed to save", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!countdown) return <p className="text-muted-foreground">Countdown not found.</p>;

  const scope = formatInstanceScope({
    allowGeneralParticipants: countdown.allowGeneralParticipants,
    allowGroupParticipants: countdown.allowGroupParticipants,
  });

  return (
    <Card className="w-full p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{countdown.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Countdown timer · {scope}
          {countdown.activeSessionId
            ? ` · ${countdown.activeSessionState === "PAUSED" ? "Paused" : "Live"}`
            : ""}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="countdown-duration">
            Duration
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Current: {formatDurationLabel(countdown.durationSec)}. Use M:SS (e.g. 5:00) or seconds.
          </p>
          <Input
            id="countdown-duration"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            placeholder="5:00"
            className="max-w-xs"
            disabled={Boolean(countdown.activeSessionId)}
          />
          {countdown.activeSessionId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Reset the live timer before changing duration.
            </p>
          )}
        </div>

        <Button onClick={save} disabled={saving || Boolean(countdown.activeSessionId)}>
          {saving ? "Saving…" : "Save configuration"}
        </Button>
      </div>
    </Card>
  );
}
