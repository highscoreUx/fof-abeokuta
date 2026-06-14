"use client";

import { useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { GalleryPanel } from "@/components/gallery/GalleryPanel";
import { GalleryToolbarControls } from "@/components/gallery/GalleryToolbarControls";
import { useAuth } from "@/hooks/useAuth";
import { useEventNav } from "@/hooks/useEventNav";
import { hasAdminShellAccess } from "@/lib/permissions";
import type { GalleryFilter } from "@/types/gallery";

export function GalleryView() {
  const { user } = useAuth();
  const { nav, participantNav, staffNav } = useEventNav();
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [team, setTeam] = useState<string | undefined>();
  const shellNav =
    user && hasAdminShellAccess(user.permissions)
      ? nav
      : staffNav.length > 1
        ? staffNav
        : participantNav;

  return (
    <PermissionGuard permission="gallery.view">
      <AppShell title="Gallery" nav={shellNav}>
        <div className="w-full space-y-6">
          <div className="flex w-full justify-end">
            <GalleryToolbarControls
              filter={filter}
              team={team}
              onFilterChange={(nextFilter, nextTeam) => {
                setFilter(nextFilter);
                setTeam(nextTeam);
              }}
            />
          </div>
          <GalleryPanel filter={filter} team={team} />
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
