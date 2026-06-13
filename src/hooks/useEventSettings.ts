"use client";

import { useEffect, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";

export interface EventSettingsSnapshot {
  teamingEnabled: boolean;
  teamChatEnabled: boolean;
  loading: boolean;
}

const DEFAULT_SETTINGS: EventSettingsSnapshot = {
  teamingEnabled: true,
  teamChatEnabled: true,
  loading: true,
};

export function useEventSettings(): EventSettingsSnapshot {
  const { api, slug } = useEventApi();
  const [settings, setSettings] = useState<EventSettingsSnapshot>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings((current) => ({ ...current, loading: true }));
    api<{ teamingEnabled?: boolean; teamChatEnabled?: boolean }>("/settings")
      .then((data) =>
        setSettings({
          teamingEnabled: data.teamingEnabled ?? true,
          teamChatEnabled: data.teamChatEnabled ?? true,
          loading: false,
        }),
      )
      .catch(() =>
        setSettings({
          teamingEnabled: true,
          teamChatEnabled: true,
          loading: false,
        }),
      );
  }, [api, slug]);

  return settings;
}
