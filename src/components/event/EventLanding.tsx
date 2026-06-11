import Link from "next/link";
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
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-primary">Friends of Figma Abeokuta</p>
            {isCurrent && (
              <p className="text-xs font-medium uppercase tracking-wide text-secondary">Current event</p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="max-w-2xl">
          {event.status === "ARCHIVED" && (
            <span className="mb-4 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Past event
            </span>
          )}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{event.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{formattedDate}</p>
          {event.description && (
            <p className="mt-6 text-base leading-relaxed text-foreground/80">{event.description}</p>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
