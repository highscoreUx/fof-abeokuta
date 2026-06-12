"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";
import { platformApiFetch } from "@/lib/platform-api-client";
import {
  consumePlatformCredentials,
  flashPlatformCredentials,
  type FlashedCredentials,
} from "@/lib/platform-credentials-flash";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";
import { PlatformAdminHeader } from "@/components/platform/PlatformAdminHeader";
import { EventCredentialsBanner } from "@/components/platform/EventCredentialsBanner";
import { EventDetailPanel } from "@/components/platform/EventDetailPanel";

export default function PlatformEventPage() {
  const router = useRouter();
  const params = useParams<{ event: string }>();
  const eventSlug = params.event;
  const { admin, accessToken, clearAuth } = usePlatformAuthStore();
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<FlashedCredentials | null>(null);

  const load = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await platformApiFetch<{ event: PlatformEvent }>(
        `/api/fg-admin/events/by-slug/${encodeURIComponent(eventSlug)}`,
      );
      setEvent(data.event);
    } catch {
      setEvent(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      platformApiFetch("/api/fg-admin/auth/refresh", { method: "POST" })
        .catch(() => router.replace("/fg-admin/login"));
    }
  }, [accessToken, router]);

  useEffect(() => {
    void load();
  }, [eventSlug]);

  useEffect(() => {
    const flashed = consumePlatformCredentials();
    if (flashed) setCreatedCredentials(flashed);
  }, []);

  const logout = async () => {
    await fetch("/api/fg-admin/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
    router.push("/fg-admin/login");
  };

  const handleCredentials = (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
  }) => {
    flashPlatformCredentials(payload);
    setCreatedCredentials(payload);
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminHeader adminEmail={admin?.email} onLogout={logout} backHref="/fg-admin" />

      <main className="mx-auto max-w-6xl space-y-8 p-6">
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
          <EventDetailPanel
            event={event}
            fallbackIndex={0}
            onUpdated={load}
            onCredentials={handleCredentials}
          />
        )}
      </main>
    </div>
  );
}
