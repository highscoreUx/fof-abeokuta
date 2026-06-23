"use client";

import { useCallback, useEffect, useState } from "react";
import { platformApiFetch } from "@/lib/platform-api-client";
import { setRolePresetCache } from "@/lib/role-preset-cache";
import type { PlatformRoleRow } from "@/lib/platform-roles.types";

export function usePlatformRoles(refreshKey = 0) {
  const [roles, setRoles] = useState<PlatformRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await platformApiFetch<{ roles: PlatformRoleRow[] }>("/api/fg-admin/roles");
      setRoles(data.roles);
      setRolePresetCache(data.roles);
    } catch {
      setRoles([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  return { roles, loading, error, reload };
}
