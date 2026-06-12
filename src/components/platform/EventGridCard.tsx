"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getEventCoverUrl } from "@/lib/event-cover";
import type { PlatformEvent } from "@/types";

interface EventGridCardProps {
  event: PlatformEvent;
  fallbackIndex: number;
}

function statusBadge(status: PlatformEvent["status"]) {
  if (status === "LIVE") return <Badge variant="success">Live</Badge>;
  if (status === "ARCHIVED") return <Badge variant="muted">Archived</Badge>;
  return <Badge variant="muted">Draft</Badge>;
}

export function EventGridCard({ event, fallbackIndex }: EventGridCardProps) {
  const coverUrl = getEventCoverUrl(event.coverImageUrl, fallbackIndex);
  const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/fg-admin/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={coverUrl}
          alt=""
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3">{statusBadge(event.status)}</div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="line-clamp-2 text-base font-semibold text-white">{event.title}</p>
        </div>
      </div>
      <div className="space-y-1 px-4 py-3">
        <p className="truncate text-xs text-muted-foreground">/{event.slug}</p>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          {typeof event.userCount === "number" && (
            <span>
              {event.userCount} user{event.userCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
