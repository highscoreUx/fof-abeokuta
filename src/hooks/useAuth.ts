"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEventScope } from "@/contexts/EventScopeContext";
import { useAuthStore } from "@/stores/authStore";
import { apiFetch } from "@/lib/api-client";
import { loginPath } from "@/lib/routes";
import { resolveDefaultRoute } from "@/lib/permissions";
import type { AuthUser } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { eventSlug, pathPrefix } = useEventScope();
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
      router.push(resolveDefaultRoute(data.user.permissions, pathPrefix));
    },
    [router, setAuth, eventSlug, pathPrefix],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch(eventSlug, "/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAuth();
    router.push(loginPath(pathPrefix));
  }, [clearAuth, router, eventSlug, pathPrefix]);

  return { accessToken, user, login, logout, isAuthenticated: Boolean(accessToken && user) };
}
