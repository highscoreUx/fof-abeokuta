"use client";

import { useEffect, useState } from "react";
import { EventActivitiesPanel } from "@/components/platform/EventActivitiesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { platformApiFetch } from "@/lib/platform-api-client";
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
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(event.title);
    setDescription(event.description ?? "");
    setDate(toDatetimeLocalValue(event.date));
  }, [event]);

  const save = async () => {
    setSaving(true);
    setError("");
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
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Event details</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the event title, description, and schedule. Slug stays the same after creation.
          </p>
        </div>
        <div className="grid max-w-xl gap-4">
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
            <Label htmlFor="settings-description">Description</Label>
            <Input
              id="settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
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
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Settings saved.</p>}
        <Button onClick={save} disabled={saving || !title.trim() || !date}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </section>

      <section className="border-t border-border pt-8">
        <EventActivitiesPanel eventId={event.id} embedded />
      </section>
    </div>
  );
}
