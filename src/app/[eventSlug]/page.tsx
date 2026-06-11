"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EventLanding } from "@/components/event/EventLanding";
import type { PlatformEvent } from "@/types";

export default function EventLandingPage() {
  const params = useParams();
  const eventSlug = params.eventSlug as string;
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/public/${eventSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEvent(d?.event ?? null))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [eventSlug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-medium text-foreground">Event not found</p>
        <Link href="/" className="mt-4 text-sm text-primary underline">
          Go home
        </Link>
      </div>
    );
  }

  return <EventLanding event={event} loginHref={`/${event.slug}/login`} />;
}
