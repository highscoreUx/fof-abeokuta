"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { platformApiFetch } from "@/lib/platform-api-client";
import {
  consumePlatformCredentials,
  flashPlatformCredentials,
  type FlashedCredentials,
} from "@/lib/platform-credentials-flash";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { EventCredentialsBanner } from "@/components/platform/EventCredentialsBanner";
import { EventDetailPanel } from "@/components/platform/EventDetailPanel";
import { usePlatformNav } from "@/hooks/usePlatformNav";

export default function PlatformEventPage() {
  const params = useParams<{ event: string }>();
  const eventSlug = params.event;
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<FlashedCredentials | null>(null);
  const nav = usePlatformNav();

  const load = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setNotFound(false);
    try {
      const data = await platformApiFetch<{ event: PlatformEvent }>(
        `/api/fg-admin/events/by-slug/${encodeURIComponent(eventSlug)}`,
      );
      setEvent(data.event);
    } catch {
      if (!silent) {
        setEvent(null);
        setNotFound(true);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [eventSlug]);

  useEffect(() => {
    const flashed = consumePlatformCredentials();
    if (flashed) setCreatedCredentials(flashed);
  }, []);

  const handleCredentials = (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
    emailQueued: boolean;
  }) => {
    flashPlatformCredentials(payload);
    setCreatedCredentials(payload);
  };

  return (
    <PlatformAppShell title={event?.title ?? "Event"} nav={nav}>
      <div className="space-y-8">
        {createdCredentials && (
          <EventCredentialsBanner
            credentials={createdCredentials}
            onDismiss={() => setCreatedCredentials(null)}
          />
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading event…</p>}

        {notFound && !loading && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="font-medium">Event not found</p>
            <p className="mt-1 text-sm text-muted-foreground">/{eventSlug} does not exist.</p>
          </div>
        )}

        {event && !loading && (
          <Suspense fallback={null}>
            <EventDetailPanel
              event={event}
              fallbackIndex={0}
              onUpdated={() => void load({ silent: true })}
              onCredentials={handleCredentials}
            />
          </Suspense>
        )}
      </div>
    </PlatformAppShell>
  );
}
