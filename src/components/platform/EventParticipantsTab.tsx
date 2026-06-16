"use client";

import { useState } from "react";
import { AddCommunityUserModal } from "@/components/platform/AddCommunityUserModal";
import { AddParticipantsFromCommunityModal } from "@/components/platform/AddParticipantsFromCommunityModal";
import { PlatformCommunityUsersTable } from "@/components/platform/PlatformCommunityUsersTable";
import { TicketImportModal } from "@/components/platform/TicketImportModal";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

interface EventParticipantsTabProps {
  event: PlatformEvent;
  onUpdated: () => void;
  onCredentials: (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
    emailQueued: boolean;
  }) => void;
}

export function EventParticipantsTab({
  event,
  onUpdated,
  onCredentials,
}: EventParticipantsTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [addFromCommunityOpen, setAddFromCommunityOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="border-t border-border pt-4 sm:border-0 sm:pt-6">
        <CardHeader className="mb-0 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-6">
          <div className="space-y-1">
            <CardTitle>Participants</CardTitle>
            <CardDescription>
              People attending this event — check-in status, teams, and participant accounts.
              Use the actions menu to promote someone to event staff for this event only.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import tickets
            </Button>
            <DropdownMenu
              align="end"
              trigger={
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary-hover"
                >
                  Add participant
                  <span aria-hidden className="text-xs opacity-80">
                    ▾
                  </span>
                </button>
              }
            >
              <DropdownMenuItem onClick={() => setAddOpen(true)}>
                Add new participant…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddFromCommunityOpen(true)}>
                Add participant from community…
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        </CardHeader>

        <div className="pt-4 sm:pt-6">
          <PlatformCommunityUsersTable
            eventId={event.id}
            audience="participants"
            refreshKey={refreshKey}
            emptyLabel="No participants yet"
            countLabel="participants"
          />
        </div>
      </div>

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
            emailQueued: credentials.emailQueued,
            user: {
              email: credentials.email,
              username: credentials.username,
              firstName: credentials.firstName,
              lastName: credentials.lastName,
              permissionProfile: credentials.permissionProfile,
            },
          });
          setRefreshKey((key) => key + 1);
          onUpdated();
        }}
      />

      <AddParticipantsFromCommunityModal
        open={addFromCommunityOpen}
        eventId={event.id}
        eventTitle={event.title}
        onClose={() => setAddFromCommunityOpen(false)}
        onAdded={() => {
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
