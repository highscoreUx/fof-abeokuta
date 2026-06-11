"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { apiFetch } from "@/lib/api-client";
import { getDefaultRouteForRole } from "@/lib/permissions";
import type { AuthUser } from "@/types";

export function useAuth(eventSlug: string) {
  const router = useRouter();
  const { accessToken, user, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await apiFetch<{ accessToken: string; user: AuthUser }>(
        eventSlug,
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
          skipAuth: true,
        },
      );
      setAuth(data.accessToken, data.user);
      router.push(getDefaultRouteForRole(data.user.role, eventSlug));
    },
    [router, setAuth, eventSlug],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch(eventSlug, "/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAuth();
    router.push(`/${eventSlug}/login`);
  }, [clearAuth, router, eventSlug]);

  return { accessToken, user, login, logout, isAuthenticated: Boolean(accessToken && user) };
}
