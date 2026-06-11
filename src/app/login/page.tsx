"use client";

import { useEffect, useState } from "react";
import { EventLoginForm } from "@/components/auth/EventLoginForm";
import Link from "next/link";

export default function CurrentEventLoginPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSlug(d?.event?.slug ?? null))
      .catch(() => setSlug(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-medium text-foreground">No live event to sign in to</p>
        <Link href="/" className="mt-4 text-sm text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  return <EventLoginForm eventSlug={slug} />;
}
