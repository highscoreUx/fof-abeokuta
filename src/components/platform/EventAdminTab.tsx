"use client";

import { useState } from "react";
import { AddEventAdminModal } from "@/components/platform/AddEventAdminModal";
import { EventAdminsTable } from "@/components/platform/EventAdminsTable";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <Card className="p-0 shadow-none">
        <CardHeader className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Event admins</CardTitle>
            <CardDescription>
              People who run this event in the app. Usernames are auto-generated — share passwords
              when you add someone.
            </CardDescription>
          </div>
          <Button className="shrink-0" onClick={() => setAddOpen(true)}>
            Add event admin
          </Button>
        </CardHeader>

        <div className="p-6 pt-4">
          <EventAdminsTable
            eventId={event.id}
            eventSlug={event.slug}
            refreshKey={refreshKey}
          />
        </div>
      </Card>

      <AddEventAdminModal
        open={addOpen}
        eventId={event.id}
        eventTitle={event.title}
        onClose={() => setAddOpen(false)}
        onCreated={({ credentials, loginPath }) => {
          onCredentials({
            eventTitle: event.title,
            loginPath,
            user: credentials,
          });
          setRefreshKey((key) => key + 1);
          onUpdated();
        }}
      />
    </>
  );
}
