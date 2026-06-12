"use client";

import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { PlatformDiagnosticsPanel } from "@/components/platform/PlatformDiagnosticsPanel";
import { usePlatformNav } from "@/hooks/usePlatformNav";

export default function PlatformDiagnosticsPage() {
  const nav = usePlatformNav();

  return (
    <PlatformAppShell title="Diagnostics" nav={nav}>
      <PlatformDiagnosticsPanel />
    </PlatformAppShell>
  );
}
