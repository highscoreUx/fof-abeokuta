"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { platformApiFetch } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

export function usePlatformAuthGuard(enabled = true) {
  const router = useRouter();
  const accessToken = usePlatformAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!enabled) return;
    if (accessToken) return;
    platformApiFetch("/api/fg-admin/auth/refresh", { method: "POST" }).catch(() =>
      router.replace("/fg-admin/login"),
    );
  }, [enabled, accessToken, router]);
}
