"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { StreamControls } from "@/components/admin/StreamControls";
import { useEventNav } from "@/hooks/useEventNav";

export function StreamingView() {
  const { nav } = useEventNav();

  return (
    <RoleGuard minimumRole="ADMIN">
      <AppShell title="Streaming & Broadcasting" nav={nav}>
        <StreamControls />
      </AppShell>
    </RoleGuard>
  );
}
