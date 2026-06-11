"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { Badge } from "@/components/ui/badge";
import type { PlatformEvent } from "@/types";

export function AllEventsView() {
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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <BrandMark className="mb-3" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">All events</h1>
            <p className="mt-1 text-sm text-muted-foreground">Browse past and upcoming FOF Abeokuta events.</p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Latest event →
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
                className="group rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">
                    {event.title}
                  </h2>
                  <Badge variant={event.status === "LIVE" ? "success" : "muted"}>{event.status}</Badge>
                </div>
                {event.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
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
