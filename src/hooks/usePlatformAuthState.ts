"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessPlatform } from "@/lib/account-permissions";
import { refreshPlatformAccessToken } from "@/lib/platform-api-client";
import { loginPath } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

export type PlatformAuthStatus = "loading" | "authenticated" | "login_required" | "access_denied";

export function usePlatformAuthState(): PlatformAuthStatus {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const accessToken = usePlatformAuthStore((state) => state.accessToken);
  const admin = usePlatformAuthStore((state) => state.admin);
  const [status, setStatus] = useState<PlatformAuthStatus>("loading");

  useEffect(() => {
    if (!isHydrated) return;

    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/fg-admin/dashboard";

    if (accessToken && admin) {
      setStatus(canAccessPlatform(admin.permissions) ? "authenticated" : "access_denied");
      return;
    }

    let cancelled = false;

    void refreshPlatformAccessToken()
      .then((ok) => {
        if (cancelled) return;

        if (!ok) {
          setStatus("login_required");
          router.replace(loginPath(returnTo));
          return;
        }

        const account = usePlatformAuthStore.getState().admin;
        if (account && !canAccessPlatform(account.permissions)) {
          setStatus("access_denied");
          return;
        }

        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("login_required");
        router.replace(loginPath(returnTo));
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken, admin, router]);

  return status;
}
