"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";
import { platformApiFetch, platformApiUpload } from "@/lib/platform-api-client";
import { consumePlatformCredentials, flashPlatformCredentials } from "@/lib/platform-credentials-flash";
import type { PlatformEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateEventModal } from "@/components/platform/CreateEventModal";
import { EventCredentialsBanner } from "@/components/platform/EventCredentialsBanner";
import { EventGridCard } from "@/components/platform/EventGridCard";
import { PlatformAdminHeader } from "@/components/platform/PlatformAdminHeader";
import type { FlashedCredentials } from "@/lib/platform-credentials-flash";

export default function PlatformAdminPage() {
  const router = useRouter();
  const { admin, accessToken, clearAuth } = usePlatformAuthStore();
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<FlashedCredentials | null>(null);

  const load = () => {
    platformApiFetch<{ events: PlatformEvent[] }>("/api/fg-admin/events").then((d) =>
      setEvents(d.events),
    );
  };

  useEffect(() => {
    if (!accessToken) {
      platformApiFetch("/api/fg-admin/auth/refresh", { method: "POST" })
        .catch(() => router.replace("/fg-admin/login"));
    }
    load();
  }, [accessToken, router]);

  useEffect(() => {
    const flashed = consumePlatformCredentials();
    if (flashed) setCreatedCredentials(flashed);
  }, []);

  const logout = async () => {
    await fetch("/api/fg-admin/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
    router.push("/fg-admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminHeader
        adminEmail={admin?.email}
        onLogout={logout}
        action={
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            Create event
          </Button>
        }
      />

      <main className="mx-auto max-w-6xl space-y-8 p-6">
        {createdCredentials && (
          <EventCredentialsBanner
            credentials={createdCredentials}
            onDismiss={() => setCreatedCredentials(null)}
          />
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Events</h2>
              <p className="text-sm text-muted-foreground">
                {events.length === 0
                  ? "No events yet. Create one to get started."
                  : "Open an event to manage activities and settings."}
              </p>
            </div>
            {events.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(true)}>
                Create event
              </Button>
            )}
          </div>

          {events.length === 0 ? (
            <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-muted-foreground">Your event grid will appear here.</p>
              <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                Create your first event
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, index) => (
                <EventGridCard key={event.id} event={event} fallbackIndex={index} />
              ))}
            </div>
          )}
        </section>
      </main>

      <CreateEventModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={async ({ event, credentials, loginPath }, coverFile) => {
          flashPlatformCredentials({
            eventTitle: event.title,
            loginPath,
            user: credentials,
          });

          if (coverFile) {
            const form = new FormData();
            form.append("file", coverFile);
            await platformApiUpload(`/api/fg-admin/events/${event.id}/cover`, form);
          }

          router.push(`/fg-admin/${event.slug}`);
        }}
      />
    </div>
  );
}
