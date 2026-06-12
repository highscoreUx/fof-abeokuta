"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { EventActivitiesPanel } from "@/components/platform/EventActivitiesPanel";
import { getEventCoverUrl } from "@/lib/event-cover";
import { platformApiFetch, platformApiUpload } from "@/lib/platform-api-client";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const coverUrl = getEventCoverUrl(event.coverImageUrl, fallbackIndex);

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

  const createEventAdmin = async () => {
    if (!adminFirstName.trim() || !adminLastName.trim()) return;
    setCreatingAdmin(true);
    try {
      const result = await platformApiFetch<{
        user: PlatformCreatedEventUser;
        loginPath: string;
      }>(`/api/fg-admin/events/${event.id}/admin-user`, {
        method: "POST",
        body: JSON.stringify({
          firstName: adminFirstName.trim(),
          lastName: adminLastName.trim(),
        }),
      });
      onCredentials({
        eventTitle: event.title,
        loginPath: result.loginPath,
        user: result.user,
      });
      setAdminFirstName("");
      setAdminLastName("");
      onUpdated();
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <Card className="overflow-hidden">
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
        {event.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href={`/${event.slug}/login`}>
            <Button size="sm" variant="outline">
              Event login
            </Button>
          </Link>
          <Link href={`/${event.slug}/home`}>
            <Button size="sm" variant="secondary">
              Open event app
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
              variant="secondary"
              disabled={statusLoading}
              onClick={() => updateStatus("ARCHIVED")}
            >
              Archive
            </Button>
          )}
        </div>

        {event.userCount === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <CardTitle className="text-base">Create event admin</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              No users yet. Add the first event admin for /{event.slug}/login.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                className="max-w-[10rem]"
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                placeholder="First name"
              />
              <Input
                className="max-w-[10rem]"
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                placeholder="Last name"
              />
              <Button
                size="sm"
                onClick={createEventAdmin}
                disabled={creatingAdmin || !adminFirstName.trim() || !adminLastName.trim()}
              >
                {creatingAdmin ? "Creating…" : "Create admin"}
              </Button>
            </div>
          </div>
        )}

        <EventActivitiesPanel eventId={event.id} />
      </div>
    </Card>
  );
}
