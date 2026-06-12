"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardTitle } from "@/components/ui/card";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

interface EventAdminTabProps {
  event: PlatformEvent;
  onUpdated: () => void;
  onCredentials: (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
  }) => void;
}

export function EventAdminTab({ event, onUpdated, onCredentials }: EventAdminTabProps) {
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <div>
          <p className="font-medium">Event login page</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff and participants sign in at /{event.slug}/login
          </p>
        </div>
        <Link href={`/${event.slug}/login`}>
          <Button size="sm" variant="outline">
            Open login page
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <CardTitle className="text-base">Event admins</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {typeof event.userCount === "number" && event.userCount > 0
            ? `${event.userCount} user${event.userCount === 1 ? "" : "s"} on this event. Create another event admin below if needed.`
            : "No users yet. Add the first event admin so someone can run the event app."}
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
            {creatingAdmin ? "Creating…" : "Create event admin"}
          </Button>
        </div>
      </div>
    </div>
  );
}
