"use client";

import { useAuthStore, type AccountSession } from "@/stores/authStore";

type RefreshResponse = {
  accessToken: string;
  account: AccountSession;
};

let inflightRefresh: Promise<boolean> | null = null;

export async function refreshSessionFromServer(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          useAuthStore.getState().clearAuth();
        }
        return false;
      }

      const data = (await response.json()) as RefreshResponse;
      if (!data.account) return false;

      useAuthStore.getState().setAccountAuth(data.accessToken, data.account);
      return true;
    } catch {
      return false;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}
