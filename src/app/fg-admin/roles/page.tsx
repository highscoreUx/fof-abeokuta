"use client";

import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { PlatformRolesView } from "@/components/platform/PlatformRolesView";
import { usePlatformNav } from "@/hooks/usePlatformNav";

export default function PlatformRolesPage() {
  const nav = usePlatformNav();

  return (
    <PlatformAppShell title="Roles" nav={nav} hideMobileTitle>
      <PlatformRolesView />
    </PlatformAppShell>
  );
}
