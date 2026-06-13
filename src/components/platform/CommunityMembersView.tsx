"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddPlatformMemberModal } from "@/components/platform/AddPlatformMemberModal";
import { PlatformMembersTable } from "@/components/platform/PlatformMembersTable";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { fgAdminMembersPath } from "@/lib/fg-admin-routes";
import type { GlobalMembersAudience } from "@/lib/member-access";

type MembersTab = "all" | "staff";

const TAB_OPTIONS: Array<{ value: MembersTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "staff", label: "Staff" },
];

function parseMembersTab(value: string | null): MembersTab {
  return value === "staff" ? "staff" : "all";
}

interface CommunityMembersViewProps {
  onToast: (message: string) => void;
}

export function CommunityMembersView({ onToast }: CommunityMembersViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseMembersTab(searchParams.get("view"));
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const setTab = useCallback(
    (next: MembersTab) => {
      router.replace(fgAdminMembersPath({ view: next === "staff" ? "staff" : undefined }), {
        scroll: false,
      });
    },
    [router],
  );

  const audience: GlobalMembersAudience = tab === "staff" ? "staff" : "all";
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
                  ? "Global staff are community members who are not participants. Event staff are managed per event."
                  : "Everyone in the community. Participants are members too — not every member is a participant."}
              </CardDescription>
            </div>
            <Button className="shrink-0" onClick={() => setAddOpen(true)}>
              {isStaff ? "Add staff" : "Add member"}
            </Button>
          </div>
          <SegmentedControl value={tab} onChange={setTab} options={TAB_OPTIONS} />
        </CardHeader>

        <div className="p-6 pt-4">
          <PlatformMembersTable
            audience={audience}
            refreshKey={refreshKey}
            emptyLabel={isStaff ? "No staff yet" : "No members yet"}
            countLabel={isStaff ? "staff" : "members"}
          />
        </div>
      </Card>

      <AddPlatformMemberModal
        open={addOpen}
        audience={audience}
        onClose={() => setAddOpen(false)}
        onCreated={(payload) => {
          onToast(
            payload.emailQueued
              ? `Created ${payload.email} (${payload.permissionProfile}) — sign-in details emailed`
              : `Created ${payload.email} (${payload.permissionProfile})`,
          );
          setRefreshKey((key) => key + 1);
        }}
      />
    </>
  );
}
