"use client";

import { useEffect, useState } from "react";
import { platformApiFetch } from "@/lib/platform-api-client";
import { Button } from "@/components/ui/button";

interface EventActivityRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  allowGeneral: boolean;
  allowGroup: boolean;
  allowStaff: boolean;
}

export function EventActivitiesPanel({
  eventId,
  embedded = false,
}: {
  eventId: string;
  embedded?: boolean;
}) {
  const [activities, setActivities] = useState<EventActivityRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    platformApiFetch<{ activities: EventActivityRow[] }>(
      `/api/fg-admin/events/${eventId}/activities`,
    ).then((data) => setActivities(data.activities));
  };

  useEffect(() => {
    load();
  }, [eventId]);

  const toggle = (slug: string, patch: Partial<EventActivityRow>) => {
    setActivities((rows) =>
      rows.map((row) => (row.slug === slug ? { ...row, ...patch } : row)),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await platformApiFetch(`/api/fg-admin/events/${eventId}/activities`, {
        method: "PATCH",
        body: JSON.stringify({
          activities: activities.map((row) => ({
            slug: row.slug,
            enabled: row.enabled,
            allowGeneral: row.allowGeneral,
            allowGroup: row.allowGroup,
            allowStaff: row.allowStaff,
          })),
        }),
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  if (activities.length === 0) return null;

  return (
    <div className={embedded ? "space-y-4" : "space-y-4 border-t border-border pt-6"}>
      {!embedded && (
        <div>
          <h3 className="text-base font-semibold">Activities</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enable activity types and choose which participant scopes event admins may use per
            instance. Team scope means every team participates separately within their own team.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {activities.map((row) => (
          <div key={row.slug} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{row.name}</p>
                {row.description && (
                  <p className="text-sm text-muted-foreground">{row.description}</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => toggle(row.slug, { enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            {row.enabled && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.allowGeneral}
                    onChange={(e) => toggle(row.slug, { allowGeneral: e.target.checked })}
                  />
                  Whole event
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.allowGroup}
                    onChange={(e) => toggle(row.slug, { allowGroup: e.target.checked })}
                  />
                  Team scope
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save activities"}
      </Button>
    </div>
  );
}
