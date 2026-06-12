"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EventAdminTab } from "@/components/platform/EventAdminTab";
import { EventSettingsTab } from "@/components/platform/EventSettingsTab";
import { getEventCoverUrl } from "@/lib/event-cover";
import { platformApiFetch, platformApiUpload } from "@/lib/platform-api-client";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

type EventConfigTab = "admin" | "settings";

const TAB_OPTIONS: Array<{ value: EventConfigTab; label: string }> = [
  { value: "admin", label: "Event admin" },
  { value: "settings", label: "Event settings" },
];

function parseTab(value: string | null): EventConfigTab {
  if (value === "settings" || value === "activities") return "settings";
  return "admin";
}

interface EventDetailPanelProps {
  event: PlatformEvent;
  fallbackIndex: number;
  onUpdated: () => void;
  onCredentials: (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
  }) => void;
}

export function EventDetailPanel({
  event,
  fallbackIndex,
  onUpdated,
  onCredentials,
}: EventDetailPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const coverUrl = getEventCoverUrl(event.coverImageUrl, fallbackIndex);

  const setTab = useCallback(
    (next: EventConfigTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "admin") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(`/fg-admin/${event.slug}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, searchParams, event.slug],
  );

  const updateStatus = async (status: "DRAFT" | "LIVE" | "ARCHIVED") => {
    setStatusLoading(true);
    try {
      await platformApiFetch(`/api/fg-admin/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onUpdated();
    } finally {
      setStatusLoading(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await platformApiUpload(`/api/fg-admin/events/${event.id}/cover`, form);
      onUpdated();
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-[21/9] max-h-56 w-full bg-muted sm:max-h-72">
        <Image src={coverUrl} alt="" fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {event.status === "LIVE" && <Badge variant="success">Live</Badge>}
              {event.status === "DRAFT" && <Badge variant="muted">Draft</Badge>}
              {event.status === "ARCHIVED" && <Badge variant="muted">Archived</Badge>}
            </div>
            <h2 className="text-2xl font-bold text-white">{event.title}</h2>
            <p className="mt-1 text-sm text-white/80">
              /{event.slug} · {new Date(event.date).toLocaleString()}
              {typeof event.userCount === "number" ? ` · ${event.userCount} users` : ""}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadCover(file);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={uploadingCover}
            onClick={() => fileRef.current?.click()}
          >
            {uploadingCover ? "Uploading…" : "Change cover"}
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl value={tab} onChange={setTab} options={TAB_OPTIONS} />

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${event.slug}`}>
              <Button size="sm" variant="secondary">
                Visit event
              </Button>
            </Link>
            {event.status !== "LIVE" && (
              <Button size="sm" disabled={statusLoading} onClick={() => updateStatus("LIVE")}>
                Go live
              </Button>
            )}
            {event.status === "LIVE" && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusLoading}
                onClick={() => updateStatus("ARCHIVED")}
              >
                Archive
              </Button>
            )}
          </div>
        </div>

        {tab === "admin" && (
          <EventAdminTab event={event} onUpdated={onUpdated} onCredentials={onCredentials} />
        )}
        {tab === "settings" && <EventSettingsTab event={event} onUpdated={onUpdated} />}
      </div>
    </Card>
  );
}
