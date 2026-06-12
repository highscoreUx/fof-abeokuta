"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddCommunityUserModal } from "@/components/platform/AddCommunityUserModal";
import { PlatformCommunityUsersTable } from "@/components/platform/PlatformCommunityUsersTable";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { fgAdminMembersPath } from "@/lib/fg-admin-routes";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

type MembersTab = "all" | "staff";

const TAB_OPTIONS: Array<{ value: MembersTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "staff", label: "Staff" },
];

function parseMembersTab(value: string | null): MembersTab {
  return value === "staff" ? "staff" : "all";
}

interface CommunityMembersViewProps {
  event: PlatformEvent;
  onUpdated: () => void;
  onCredentials: (payload: {
    eventTitle: string;
    loginPath: string;
    user: PlatformCreatedEventUser;
  }) => void;
  onToast: (message: string) => void;
}

export function CommunityMembersView({
  event,
  onUpdated,
  onCredentials,
  onToast,
}: CommunityMembersViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseMembersTab(searchParams.get("view"));
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const setTab = useCallback(
    (next: MembersTab) => {
      router.replace(
        fgAdminMembersPath({
          eventSlug: event.slug,
          view: next === "staff" ? "staff" : undefined,
        }),
        { scroll: false },
      );
    },
    [router, event.slug],
  );

  const isStaff = tab === "staff";

  return (
    <>
      <Card className="p-0 shadow-none">
        <CardHeader className="space-y-4 border-b border-border p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {isStaff
                  ? "Staff are community members with elevated permissions for this event."
                  : "Everyone registered for this event. Staff also appear here — use the Staff tab to focus on them."}
              </CardDescription>
            </div>
            <Button className="shrink-0" onClick={() => setAddOpen(true)}>
              {isStaff ? "Add staff" : "Add member"}
            </Button>
          </div>
          <SegmentedControl value={tab} onChange={setTab} options={TAB_OPTIONS} />
        </CardHeader>

        <div className="p-6 pt-4">
          <PlatformCommunityUsersTable
            eventId={event.id}
            audience={isStaff ? "staff" : "members"}
            refreshKey={refreshKey}
            emptyLabel={isStaff ? "No staff yet" : "No members yet"}
            countLabel={isStaff ? "staff" : "members"}
          />
        </div>
      </Card>

      <AddCommunityUserModal
        open={addOpen}
        eventId={event.id}
        eventTitle={event.title}
        mode={isStaff ? "staff" : "members"}
        onClose={() => setAddOpen(false)}
        onCreated={(credentials) => {
          if (isStaff) {
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
          } else {
            onToast(
              `Created ${credentials.email} (${credentials.permissionProfile}) — temp password: ${credentials.password}`,
            );
          }
          setRefreshKey((key) => key + 1);
          onUpdated();
        }}
      />
    </>
  );
}
