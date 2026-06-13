"use client";

import { useEffect, useState } from "react";
import { EventActivitiesPanel } from "@/components/platform/EventActivitiesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { usePlatformEventSettings } from "@/hooks/usePlatformEventSettings";
import { platformApiFetch } from "@/lib/platform-api-client";
import { toastError, toastSuccess } from "@/lib/toast";
import type { PlatformEvent } from "@/types";

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EventSettingsTabProps {
  event: PlatformEvent;
  onUpdated: () => void;
}

export function EventSettingsTab({ event, onUpdated }: EventSettingsTabProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [date, setDate] = useState(toDatetimeLocalValue(event.date));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [teamingEnabled, setTeamingEnabled] = useState(true);
  const [savingTeaming, setSavingTeaming] = useState(false);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);
  const { teamingEnabled: loadedTeamingEnabled, loading: teamingLoading } = usePlatformEventSettings(
    event.id,
    settingsRefreshKey,
  );

  useEffect(() => {
    setTeamingEnabled(loadedTeamingEnabled);
  }, [loadedTeamingEnabled]);

  useEffect(() => {
    setTitle(event.title);
    setDescription(event.description ?? "");
    setDate(toDatetimeLocalValue(event.date));
  }, [event]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await platformApiFetch(`/api/fg-admin/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          date: new Date(date).toISOString(),
        }),
      });
      onUpdated();
      setSaved(true);
    } catch (err) {
      toastError(
        "Failed to save settings",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const saveTeaming = async (enabled: boolean) => {
    setSavingTeaming(true);
    setTeamingEnabled(enabled);
    try {
      await platformApiFetch(`/api/fg-admin/events/${event.id}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ teamingEnabled: enabled }),
      });
      setSettingsRefreshKey((key) => key + 1);
      toastSuccess(enabled ? "Teaming enabled" : "Teaming disabled");
    } catch (err) {
      setTeamingEnabled(loadedTeamingEnabled);
      toastError(
        "Failed to update teaming",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSavingTeaming(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <section className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Event details</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Update the event title, description, and schedule. Slug stays the same after creation.
            </p>
          </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="settings-title">Title</Label>
            <Input
              id="settings-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="settings-date">Date & time</Label>
            <Input
              id="settings-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="settings-description">Description</Label>
            <Input
              id="settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        {saved && <p className="text-sm text-emerald-600">Settings saved.</p>}
        <Button onClick={save} disabled={saving || !title.trim() || !date}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        </div>

        <div className="space-y-4 border-t border-border pt-6">
          <div>
            <h3 className="text-base font-semibold">Teaming</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When disabled, teams, auto-assign, team chat, and team-scoped activities are unavailable
              for this event.
            </p>
          </div>
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition",
              !teamingLoading && "hover:bg-muted/40",
              (teamingLoading || savingTeaming) && "opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={teamingEnabled}
              disabled={teamingLoading || savingTeaming}
              onChange={(e) => void saveTeaming(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">Enable teaming</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Participants can be grouped into teams, use team chat, and join team-scoped activities.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="space-y-4 lg:border-l lg:border-border lg:pl-8">
        <div>
          <h3 className="text-base font-semibold">Activities</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enable activity types and choose participant scopes.
            {teamingEnabled
              ? " Team scope means each team participates separately within their own team."
              : " Team scope is unavailable while teaming is disabled."}
          </p>
        </div>
        <EventActivitiesPanel eventId={event.id} embedded teamingEnabled={teamingEnabled} />
      </section>
    </div>
  );
}
