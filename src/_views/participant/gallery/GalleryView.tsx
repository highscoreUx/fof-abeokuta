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
      <AppShell
        title="Gallery"
        nav={shellNav}
        contentClassName="max-w-7xl"
        hideMobileTitle
        hideMobileHeader
        mobileEdgeToEdge
      >
        <div className="flex h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] min-h-0 flex-col overflow-hidden lg:h-auto lg:max-h-none">
          <div className="hidden w-full shrink-0 justify-end lg:flex lg:pb-0 lg:pt-0">
            <GalleryToolbarControls
              filter={filter}
              team={team}
              onFilterChange={(nextFilter, nextTeam) => {
                setFilter(nextFilter);
                setTeam(nextTeam);
              }}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col lg:block lg:flex-none lg:space-y-6">
            <GalleryPanel
              filter={filter}
              team={team}
              onFilterChange={(nextFilter, nextTeam) => {
                setFilter(nextFilter);
                setTeam(nextTeam);
              }}
            />
          </div>
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
