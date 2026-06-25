"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { getEventCoverUrl } from "@/lib/event-cover";
import { coverFallbackIndex, formatEventDate } from "@/lib/event-schedule";
import type { CountdownParts } from "@/lib/event-schedule";
import type { PlatformEvent } from "@/types";

interface EventCountdownLandingProps {
  event: PlatformEvent;
  loginHref: string;
  parts: CountdownParts;
  isCurrent?: boolean;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[4.25rem] flex-1 flex-col items-center rounded-2xl border border-white/20 bg-white/10 px-3 py-4 backdrop-blur-md sm:min-w-[5.5rem] sm:px-5 sm:py-6">
      <span className="text-3xl font-semibold tabular-nums tracking-tight text-white sm:text-4xl lg:text-5xl">
        {value}
      </span>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export function EventCountdownLanding({
  event,
  loginHref,
  parts,
  isCurrent = false,
}: EventCountdownLandingProps) {
  const coverUrl = getEventCoverUrl(event.coverImageUrl, coverFallbackIndex(event.slug));
  const { calendar, time } = formatEventDate(event.date);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Image
        src={coverUrl}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-[#7c3aed]/85 to-secondary/80" />
      <div className="absolute inset-0 bg-black/25" />

      <header className="relative z-10 border-b border-white/10 bg-black/15 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandMark className="[&_p]:text-white [&_span]:text-white/75" />
          <div className="flex items-center gap-3">
            <Link
              href="/all-event"
              className="hidden text-sm font-medium text-white/80 transition hover:text-white sm:inline"
            >
              All events
            </Link>
            <Link
              href={loginHref}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-3xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {isCurrent ? "Upcoming event · Latest" : "Upcoming event"}
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-tight">
          {event.title}
        </h1>

        <p className="mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
          The event hasn&apos;t started yet. You&apos;re in the waiting room — we&apos;ll open the doors right on time.
        </p>

        <div className="mt-10 flex w-full max-w-xl gap-2 sm:gap-3">
          <CountdownUnit value={parts.days} label="Days" />
          <CountdownUnit value={parts.hours} label="Hours" />
          <CountdownUnit value={parts.minutes} label="Minutes" />
          <CountdownUnit value={parts.seconds} label="Seconds" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/85 sm:text-base">
          <span className="inline-flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {calendar}
          </span>
          {time && (
            <span className="inline-flex items-center gap-2">
              <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {time}
            </span>
          )}
        </div>

        <p className="mt-10 text-sm text-white/70">
          Already registered?{" "}
          <Link href={loginHref} className="font-medium text-white underline-offset-4 hover:underline">
            Sign in early
          </Link>
        </p>
      </main>
    </div>
  );
}
