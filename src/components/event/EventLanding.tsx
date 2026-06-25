import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { Badge } from "@/components/ui/badge";
import { getEventCoverUrl } from "@/lib/event-cover";
import { coverFallbackIndex, formatEventDate } from "@/lib/event-schedule";
import type { PlatformEvent } from "@/types";

interface EventLandingProps {
  event: PlatformEvent;
  loginHref: string;
  isCurrent?: boolean;
}

function statusLabel(status: PlatformEvent["status"]) {
  if (status === "LIVE") return { text: "Happening now", variant: "success" as const };
  if (status === "ARCHIVED") return { text: "Past event", variant: "muted" as const };
  return { text: "Coming soon", variant: "muted" as const };
}

const HIGHLIGHTS = [
  {
    title: "Community chat",
    description: "Message your team, staff, and the whole event in real time.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    title: "Live activities",
    description: "Join trivia, team games, and on-stage moments as they go live.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Event gallery",
    description: "Browse and share photos from the day in one shared album.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: "Agenda & updates",
    description: "Follow the schedule and never miss what matters to you.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
] as const;

export function EventLanding({ event, loginHref, isCurrent = false }: EventLandingProps) {
  const coverUrl = getEventCoverUrl(event.coverImageUrl, coverFallbackIndex(event.slug));
  const { long, short, time } = formatEventDate(event.date);
  const status = statusLabel(event.status);
  const ctaLabel =
    event.status === "ARCHIVED" ? "Sign in to view" : "Sign in to join";

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandMark className="[&_p]:text-white [&_span]:text-white/80" />
          <div className="flex items-center gap-3">
            <Link
              href="/all-event"
              className="hidden text-sm font-medium text-white/80 transition hover:text-white sm:inline"
            >
              All events
            </Link>
            <Link
              href={loginHref}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-3 text-xs font-medium text-secondary-foreground shadow-md transition hover:bg-secondary-hover"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[min(100dvh,52rem)] overflow-hidden">
        <Image
          src={coverUrl}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/25 via-transparent to-secondary/15 mix-blend-soft-light" />

        <div className="relative mx-auto flex min-h-[min(100dvh,52rem)] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge variant={status.variant} className="border-white/20 bg-white/10 text-white backdrop-blur-sm">
                {status.text}
              </Badge>
              {isCurrent && (
                <Badge variant="secondary" className="shadow-sm">
                  Latest event
                </Badge>
              )}
              {typeof event.userCount === "number" && event.userCount > 0 && (
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {event.userCount} registered
                </span>
              )}
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              {event.title}
            </h1>

            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-white/85 sm:text-lg">
              <span className="inline-flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {long}
              </span>
              {time && (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {time}
                </span>
              )}
            </p>

            {event.description && (
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                {event.description}
              </p>
            )}

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={loginHref}
                className="inline-flex h-11 min-w-[10rem] items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground shadow-lg transition hover:bg-primary-hover"
              >
                {ctaLabel}
              </Link>
              <a
                href="#about"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Learn more
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">About this event</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your hub for everything happening at {event.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {event.description ??
                "Sign in with the account you received from organizers to chat with other attendees, join live activities, and follow along throughout the day."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Event details</h3>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-border/80 pb-4">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-right font-medium text-foreground">{short}</dd>
              </div>
              {time && (
                <div className="flex justify-between gap-4 border-b border-border/80 pb-4">
                  <dt className="text-muted-foreground">Time</dt>
                  <dd className="text-right font-medium text-foreground">{time}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-b border-border/80 pb-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-right font-medium text-foreground">{status.text}</dd>
              </div>
              {typeof event.userCount === "number" && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Attendees</dt>
                  <dd className="text-right font-medium text-foreground">{event.userCount}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">What to expect</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One place for the full event experience
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/25 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-gradient-to-br from-surface via-background to-accent-light">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 sm:flex-row sm:items-center sm:px-6 lg:py-20">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Ready to jump in?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Use the email and password from your welcome message to sign in. First time here? Ask an organizer if you
              need help finding your credentials.
            </p>
          </div>
          <Link
            href={loginHref}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground shadow-md transition hover:bg-primary-hover"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <BrandMark compact />
          <div className="flex flex-wrap gap-4">
            <Link href="/all-event" className="font-medium text-primary hover:text-primary-hover">
              Browse all events
            </Link>
            <Link href={loginHref} className="font-medium text-primary hover:text-primary-hover">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
