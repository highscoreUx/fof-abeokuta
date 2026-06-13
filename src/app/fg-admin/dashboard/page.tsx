"use client";

import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { PlatformDashboard } from "@/components/platform/PlatformDashboard";
import { usePlatformNav } from "@/hooks/usePlatformNav";

export default function PlatformDashboardPage() {
  const nav = usePlatformNav();

  return (
    <PlatformAppShell title="Dashboard" nav={nav}>
      <PlatformDashboard />
    </PlatformAppShell>
  );
}
