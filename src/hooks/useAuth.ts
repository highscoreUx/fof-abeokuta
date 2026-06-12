"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { loginPath } from "@/lib/routes";

export function useAuth() {
  const router = useRouter();
  const { accessToken, account, user, clearAuth, isHydrated } = useAuthStore();

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    clearAuth();
    router.push(loginPath());
  }, [clearAuth, router]);

  return {
    accessToken,
    account,
    user,
    logout,
    isHydrated,
    isAuthenticated: Boolean(accessToken && account),
  };
}
