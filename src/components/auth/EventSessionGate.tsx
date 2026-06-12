"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLoadingPanel } from "@/components/auth/AuthLoadingPanel";
import { Button } from "@/components/ui/button";
import { useEventScope } from "@/contexts/EventScopeContext";
import { loginPath } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/types";

type GateStatus = "loading" | "ready" | "error";

function currentReturnTo(fallback: string) {
  if (typeof window === "undefined") return fallback;
  const path = `${window.location.pathname}${window.location.search}`;
  return path || fallback;
}

export function EventSessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { eventSlug } = useEventScope();
  const account = useAuthStore((s) => s.account);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setEventUser = useAuthStore((s) => s.setEventUser);
  const [status, setStatus] = useState<GateStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const loadSession = useCallback(async () => {
    if (!isHydrated) return;

    const fallbackPath = eventSlug ? `/${eventSlug}/home` : "/home";

    if (!accessToken || !account) {
      router.replace(loginPath(currentReturnTo(fallbackPath)));
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(`/api/events/${eventSlug}/session`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        useAuthStore.getState().clearAuth();
        router.replace(loginPath(currentReturnTo(fallbackPath)));
        return;
      }

      if (!response.ok) {
        setStatus("error");
        return;
      }

      const data = (await response.json()) as {
        registered: boolean;
        checkInRequired?: boolean;
        user?: AuthUser | null;
      };

      if (!data.registered) {
        setEventUser(null);
        router.replace(`/${eventSlug}/not-registered`);
        return;
      }

      if (data.checkInRequired || !data.user) {
        setEventUser(null);
        router.replace(loginPath(currentReturnTo(fallbackPath)));
        return;
      }

      setEventUser(data.user);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [accessToken, account, eventSlug, isHydrated, router, setEventUser]);

  useEffect(() => {
    void loadSession();
  }, [loadSession, reloadKey]);

  if (!isHydrated || status === "loading") {
    return <AuthLoadingPanel label="Loading your session…" />;
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-center text-sm text-muted-foreground">
          Could not load your event session. Check your connection and try again.
        </p>
        <Button type="button" onClick={() => setReloadKey((key) => key + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
