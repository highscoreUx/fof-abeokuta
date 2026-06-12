"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { platformApiFetch } from "@/lib/platform-api-client";
import {
  consumePlatformCredentials,
  flashPlatformCredentials,
  type FlashedCredentials,
} from "@/lib/platform-credentials-flash";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { CommunityMembersView } from "@/components/platform/CommunityMembersView";
import { EventCredentialsBanner } from "@/components/platform/EventCredentialsBanner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { fgAdminMembersPath } from "@/lib/fg-admin-routes";
import { usePlatformNav } from "@/hooks/usePlatformNav";
import type { PaginatedResponse } from "@/lib/pagination";

function MembersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event");
  const nav = usePlatformNav();

  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<FlashedCredentials | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await platformApiFetch<PaginatedResponse<PlatformEvent>>(
        "/api/fg-admin/events?limit=100&sortBy=date&sortOrder=desc",
      );
      setEvents(data.data);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadEvent = useCallback(async () => {
    if (!eventSlug) {
      setEvent(null);
      setNotFound(false);
      return;
    }
    setEventLoading(true);
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
      setEventLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    const flashed = consumePlatformCredentials();
    if (flashed) setCreatedCredentials(flashed);
  }, []);

  const handleCredentials = (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
  }) => {
    flashPlatformCredentials(payload);
    setCreatedCredentials(payload);
  };

  const selectEvent = (slug: string) => {
    const view = searchParams.get("view") === "staff" ? ("staff" as const) : undefined;
    router.replace(fgAdminMembersPath({ eventSlug: slug || undefined, view }), { scroll: false });
  };

  return (
    <PlatformAppShell title={event ? `Members — ${event.title}` : "Members"} nav={nav}>
      <div className="space-y-6">
        {toast && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            {toast}
          </div>
        )}
        {createdCredentials && (
          <EventCredentialsBanner
            credentials={createdCredentials}
            onDismiss={() => setCreatedCredentials(null)}
          />
        )}

        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Manage community members and staff for an event. Pick an event to get started.
              </CardDescription>
            </div>
            <div className="max-w-md">
              <Label htmlFor="members-event">Event</Label>
              <Select
                id="members-event"
                className="mt-2 w-full"
                value={eventSlug ?? ""}
                onChange={(e) => selectEvent(e.target.value)}
                disabled={eventsLoading}
              >
                <option value="">{eventsLoading ? "Loading events…" : "Select an event"}</option>
                {events.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>
        </Card>

        {!eventSlug && !eventsLoading && (
          <p className="text-sm text-muted-foreground">Select an event to view its members.</p>
        )}

        {eventSlug && eventLoading && (
          <p className="text-sm text-muted-foreground">Loading members…</p>
        )}

        {eventSlug && notFound && !eventLoading && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="font-medium">Event not found</p>
            <p className="mt-1 text-sm text-muted-foreground">/{eventSlug} does not exist.</p>
          </div>
        )}

        {event && !eventLoading && (
          <CommunityMembersView
            event={event}
            onUpdated={loadEvent}
            onCredentials={handleCredentials}
            onToast={showToast}
          />
        )}
      </div>
    </PlatformAppShell>
  );
}

export default function PlatformMembersPage() {
  return (
    <Suspense fallback={null}>
      <MembersPageContent />
    </Suspense>
  );
}
