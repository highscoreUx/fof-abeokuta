"use client";

import { useState } from "react";
import { AddCommunityUserModal } from "@/components/platform/AddCommunityUserModal";
import { PlatformCommunityUsersTable } from "@/components/platform/PlatformCommunityUsersTable";
import { TicketImportModal } from "@/components/platform/TicketImportModal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

interface EventParticipantsTabProps {
  event: PlatformEvent;
  onUpdated: () => void;
  onCredentials: (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
  }) => void;
}

export function EventParticipantsTab({
  event,
  onUpdated,
  onCredentials,
}: EventParticipantsTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <Card className="p-0 shadow-none">
        <CardHeader className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Participants</CardTitle>
            <CardDescription>
              People attending this event — check-in status, teams, and participant accounts.
              Event staff are managed on the Staff tab.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import tickets
            </Button>
            <Button onClick={() => setAddOpen(true)}>Add participant</Button>
          </div>
        </CardHeader>

        <div className="p-6 pt-4">
          <PlatformCommunityUsersTable
            eventId={event.id}
            audience="participants"
            refreshKey={refreshKey}
            emptyLabel="No participants yet"
            countLabel="participants"
          />
        </div>
      </Card>

      <AddCommunityUserModal
        open={addOpen}
        eventId={event.id}
        eventTitle={event.title}
        mode="participants"
        onClose={() => setAddOpen(false)}
        onCreated={(credentials) => {
          onCredentials({
            eventTitle: event.title,
            loginPath: "/login",
            user: {
              email: credentials.email,
              username: credentials.username,
              password: credentials.password,
              firstName: credentials.firstName,
              lastName: credentials.lastName,
              permissionProfile: credentials.permissionProfile,
            },
          });
          setRefreshKey((key) => key + 1);
          onUpdated();
        }}
      />

      <TicketImportModal
        open={importOpen}
        eventId={event.id}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setRefreshKey((key) => key + 1);
          onUpdated();
        }}
      />
    </>
  );
}
