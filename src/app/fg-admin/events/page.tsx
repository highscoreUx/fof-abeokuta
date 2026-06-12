"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { consumePlatformCredentials } from "@/lib/platform-credentials-flash";
import { CreateEventModal } from "@/components/platform/CreateEventModal";
import { EventCredentialsBanner } from "@/components/platform/EventCredentialsBanner";
import { EventsPanel } from "@/components/platform/EventsPanel";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { fgAdminEventPath } from "@/lib/fg-admin-routes";
import { usePlatformNav } from "@/hooks/usePlatformNav";
import type { FlashedCredentials } from "@/lib/platform-credentials-flash";

export default function PlatformEventsPage() {
  const router = useRouter();
  const nav = usePlatformNav();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createdCredentials, setCreatedCredentials] = useState<FlashedCredentials | null>(null);

  useEffect(() => {
    const flashed = consumePlatformCredentials();
    if (flashed) setCreatedCredentials(flashed);
  }, []);

  return (
    <PlatformAppShell title="Events" nav={nav}>
      <div className="space-y-6">
        {createdCredentials && (
          <EventCredentialsBanner
            credentials={createdCredentials}
            onDismiss={() => setCreatedCredentials(null)}
          />
        )}

        <EventsPanel
          refreshKey={refreshKey}
          onCreateClick={() => setCreateModalOpen(true)}
        />
      </div>

      <CreateEventModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(event) => {
          setRefreshKey((key) => key + 1);
          router.push(fgAdminEventPath(event.slug));
        }}
      />
    </PlatformAppShell>
  );
}
