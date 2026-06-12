"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { platformApiUpload } from "@/lib/platform-api-client";
import { consumePlatformCredentials, flashPlatformCredentials } from "@/lib/platform-credentials-flash";
import { CreateEventModal } from "@/components/platform/CreateEventModal";
import { EventCredentialsBanner } from "@/components/platform/EventCredentialsBanner";
import { EventsPanel } from "@/components/platform/EventsPanel";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { usePlatformNav } from "@/hooks/usePlatformNav";
import type { FlashedCredentials } from "@/lib/platform-credentials-flash";

export default function PlatformAdminPage() {
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
        onCreated={async ({ event, credentials, loginPath }, coverFile) => {
          flashPlatformCredentials({
            eventTitle: event.title,
            loginPath,
            user: credentials,
          });

          if (coverFile) {
            const form = new FormData();
            form.append("file", coverFile);
            await platformApiUpload(`/api/fg-admin/events/${event.id}/cover`, form);
          }

          setRefreshKey((key) => key + 1);
          router.push(`/fg-admin/${event.slug}`);
        }}
      />
    </PlatformAppShell>
  );
}
