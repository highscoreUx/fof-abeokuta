"use client";

import { useState } from "react";
import { AddCommunityUserModal } from "@/components/platform/AddCommunityUserModal";
import { PlatformCommunityUsersTable } from "@/components/platform/PlatformCommunityUsersTable";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

interface CommunityStaffTabProps {
  event: PlatformEvent;
  onUpdated: () => void;
  onCredentials: (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
    emailQueued: boolean;
  }) => void;
}

export function CommunityStaffTab({
  event,
  onUpdated,
  onCredentials,
}: CommunityStaffTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="border-t border-border pt-4 sm:border-0 sm:pt-6">
        <CardHeader className="mb-0 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-6">
          <div className="space-y-1">
            <CardTitle>Staff</CardTitle>
            <CardDescription>
              Event staff for this event — coordinators, staff, judges, and admins assigned here.
              Global members and platform staff are managed under Members in the sidebar.
            </CardDescription>
          </div>
          <Button className="shrink-0" onClick={() => setAddOpen(true)}>
            Add staff
          </Button>
        </CardHeader>

        <div className="pt-4 sm:pt-6">
          <PlatformCommunityUsersTable
            eventId={event.id}
            audience="staff"
            refreshKey={refreshKey}
            emptyLabel="No community staff yet"
            countLabel="staff"
          />
        </div>
      </div>

      <AddCommunityUserModal
        open={addOpen}
        eventId={event.id}
        eventTitle={event.title}
        mode="staff"
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
    </>
  );
}
