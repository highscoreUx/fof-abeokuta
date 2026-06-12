"use client";

import { useState } from "react";
import { AddCommunityUserModal } from "@/components/platform/AddCommunityUserModal";
import { PlatformCommunityUsersTable } from "@/components/platform/PlatformCommunityUsersTable";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

interface CommunityStaffTabProps {
  event: PlatformEvent;
  onUpdated: () => void;
  onCredentials: (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
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
      <Card className="p-0 shadow-none">
        <CardHeader className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
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

        <div className="p-6 pt-4">
          <PlatformCommunityUsersTable
            eventId={event.id}
            audience="staff"
            refreshKey={refreshKey}
            emptyLabel="No community staff yet"
            countLabel="staff"
          />
        </div>
      </Card>

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
    </>
  );
}
