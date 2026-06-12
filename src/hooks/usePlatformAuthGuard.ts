"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canAccessPlatform } from "@/lib/account-permissions";
import { refreshPlatformAccessToken } from "@/lib/platform-api-client";
import { loginPath } from "@/lib/routes";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

export function usePlatformAuthGuard(enabled = true) {
  const router = useRouter();
  const accessToken = usePlatformAuthStore((state) => state.accessToken);
  const admin = usePlatformAuthStore((state) => state.admin);

  useEffect(() => {
    if (!enabled) return;

    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/fg-admin/events";

    if (accessToken && admin) {
      if (!canAccessPlatform(admin.permissions)) {
        router.replace("/fg-admin/access-denied");
      }
      return;
    }

    refreshPlatformAccessToken()
      .then((ok) => {
        if (!ok) {
          router.replace(loginPath(returnTo));
          return;
        }
        const account = usePlatformAuthStore.getState().admin;
        if (account && !canAccessPlatform(account.permissions)) {
          router.replace("/fg-admin/access-denied");
        }
      })
      .catch(() => router.replace(loginPath(returnTo)));
  }, [enabled, accessToken, admin, router]);
}
