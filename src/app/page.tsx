"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlatformEvent } from "@/types";

export default function HomePage() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);

  useEffect(() => {
    fetch("/api/events/public")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm font-semibold text-primary">Friends of Figma Abeokuta</p>
            <h1 className="text-3xl font-bold text-foreground">Event Platform</h1>
          </div>
          <Link
            href="/fg-admin"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Platform Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-6 text-xl font-semibold">Events</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No events yet. Create one in Platform Admin.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/${event.slug}/login`}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {event.status}
                  </span>
                </div>
                {event.description && (
                  <p className="mb-3 text-sm text-muted-foreground">{event.description}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
