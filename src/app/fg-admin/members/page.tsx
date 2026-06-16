"use client";

import { Suspense, useEffect, useState } from "react";
import { consumePlatformCredentials } from "@/lib/platform-credentials-flash";
import type { FlashedCredentials } from "@/lib/platform-credentials-flash";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { CommunityMembersView } from "@/components/platform/CommunityMembersView";
import { EventCredentialsBanner } from "@/components/platform/EventCredentialsBanner";
import { usePlatformNav } from "@/hooks/usePlatformNav";

function MembersPageContent() {
  const nav = usePlatformNav();
  const [createdCredentials, setCreatedCredentials] = useState<FlashedCredentials | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const flashed = consumePlatformCredentials();
    if (flashed) setCreatedCredentials(flashed);
  }, []);

  return (
    <PlatformAppShell title="Members" nav={nav} hideMobileTitle>
      <div className="space-y-6">
        {toast && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            {toast}
          </div>
        )}
        {createdCredentials && (
          <EventCredentialsBanner
            credentials={createdCredentials}
            onDismiss={() => setCreatedCredentials(null)}
          />
        )}

        <CommunityMembersView onToast={showToast} />
      </div>
    </PlatformAppShell>
  );
}

export default function PlatformMembersPage() {
  return (
    <Suspense fallback={null}>
      <MembersPageContent />
    </Suspense>
  );
}
