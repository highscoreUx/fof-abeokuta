"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PlatformEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

export default function PlatformAdminPage() {
  const router = useRouter();
  const { admin, accessToken, clearAuth } = usePlatformAuthStore();
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

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

  const createEvent = async () => {
    if (!title || !date) return;
    setLoading(true);
    try {
      await platformApiFetch("/api/fg-admin/events", {
        method: "POST",
        body: JSON.stringify({ title, description, date: new Date(date).toISOString() }),
      });
      setTitle("");
      setDescription("");
      setDate("");
      load();
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "DRAFT" | "LIVE" | "ARCHIVED") => {
    await platformApiFetch(`/api/fg-admin/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  };

  const logout = async () => {
    await fetch("/api/fg-admin/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
    router.push("/fg-admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Friends of Figma Abeokuta</p>
            <h1 className="text-2xl font-bold">Platform Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{admin?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 p-6">
        <Card>
          <CardTitle>Create Event</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Event slug is auto-generated from the title using slugify.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input
              className="sm:col-span-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          <Button className="mt-4" onClick={createEvent} disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </Card>

        <Card>
          <CardTitle>All Events</CardTitle>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    /{event.slug} · {new Date(event.date).toLocaleDateString()} · {event.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/${event.slug}/admin`}>
                    <Button size="sm" variant="secondary">
                      Event Admin
                    </Button>
                  </Link>
                  <Link href={`/${event.slug}/login`}>
                    <Button size="sm" variant="ghost">
                      Login
                    </Button>
                  </Link>
                  {event.status !== "LIVE" && (
                    <Button size="sm" onClick={() => updateStatus(event.id, "LIVE")}>
                      Go Live
                    </Button>
                  )}
                  {event.status === "LIVE" && (
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(event.id, "ARCHIVED")}>
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
