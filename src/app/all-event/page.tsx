"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlatformEvent } from "@/types";

export default function AllEventsPage() {
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
            <h1 className="text-2xl font-bold text-foreground">All events</h1>
          </div>
          <Link href="/" className="text-sm text-primary underline">
            Current event
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {events.length === 0 ? (
          <p className="text-muted-foreground">No events yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/${event.slug}`}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{event.title}</h2>
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
