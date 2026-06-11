import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { Badge } from "@/components/ui/badge";
import type { PlatformEvent } from "@/types";

interface EventLandingProps {
  event: PlatformEvent;
  loginHref: string;
  isCurrent?: boolean;
}

export function EventLanding({ event, loginHref, isCurrent = false }: EventLandingProps) {
  const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-background to-background">
      <header className="border-b border-border/80 bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <BrandMark />
          {isCurrent && <Badge variant="secondary">Latest event</Badge>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <div className="mb-4 flex flex-wrap gap-2">
            {event.status === "ARCHIVED" && <Badge variant="muted">Past event</Badge>}
            {event.status === "LIVE" && <Badge variant="success">Live</Badge>}
            {event.status === "DRAFT" && <Badge variant="muted">Draft</Badge>}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {event.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{formattedDate}</p>
          {event.description && (
            <p className="mt-6 text-base leading-relaxed text-foreground/80">{event.description}</p>
          )}
          <div className="mt-10">
            <Link
              href={loginHref}
              className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary-hover"
            >
              Sign in to event
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
