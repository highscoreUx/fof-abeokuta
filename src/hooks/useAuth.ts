"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEventScope } from "@/contexts/EventScopeContext";
import { useAuthStore } from "@/stores/authStore";
import { apiFetch } from "@/lib/api-client";
import { loginPath } from "@/lib/routes";

export function useAuth() {
  const router = useRouter();
  const { eventSlug } = useEventScope();
  const { accessToken, user, setEventAuth, clearAuth, isHydrated } = useAuthStore();

  const logout = useCallback(async () => {
    try {
      await apiFetch(eventSlug, "/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAuth();
    router.push(loginPath());
  }, [clearAuth, router, eventSlug]);

  return {
    accessToken,
    user,
    setEventAuth,
    logout,
    isHydrated,
    isAuthenticated: Boolean(accessToken && user),
  };
}
