"use client";

import { useEffect, useState } from "react";
import { platformApiFetch } from "@/lib/platform-api-client";

export function usePlatformEventSettings(eventId: string, refreshKey = 0) {
  const [teamingEnabled, setTeamingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformApiFetch<{ teamingEnabled: boolean }>(`/api/fg-admin/events/${eventId}/settings`)
      .then((data) => setTeamingEnabled(data.teamingEnabled ?? true))
      .catch(() => setTeamingEnabled(true))
      .finally(() => setLoading(false));
  }, [eventId, refreshKey]);

  return { teamingEnabled, loading };
}
