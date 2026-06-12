"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEventScope } from "@/contexts/EventScopeContext";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/types";

export function EventSessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { eventSlug } = useEventScope();
  const account = useAuthStore((s) => s.account);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setEventUser = useAuthStore((s) => s.setEventUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken || !account) {
      setReady(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/events/${eventSlug}/session`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (cancelled) return;

        if (response.status === 401) {
          useAuthStore.getState().clearAuth();
          router.replace(`/login?next=${encodeURIComponent(`/${eventSlug}/home`)}`);
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
          router.replace(`/login?next=${encodeURIComponent(`/${eventSlug}/home`)}`);
          return;
        }

        setEventUser(data.user);
        setReady(true);
      } catch {
        if (!cancelled) setReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, account, eventSlug, isHydrated, router, setEventUser]);

  if (!isHydrated || !ready) {
    return null;
  }

  return <>{children}</>;
}
