"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminPageTitleProvider } from "@/contexts/AdminPageTitleContext";
import { AppShell } from "@/components/layout/AppShell";
import { resolveAdminPageTitle } from "@/lib/admin-page-titles";
import { useEventNav } from "@/hooks/useEventNav";

export function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { nav } = useEventNav();
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const defaultTitle = resolveAdminPageTitle(pathname);
  const title = titleOverride ?? defaultTitle;

  useEffect(() => {
    setTitleOverride(null);
  }, [pathname]);

  return (
    <AdminPageTitleProvider setTitle={setTitleOverride}>
      <AppShell title={title} nav={nav}>
        {children}
      </AppShell>
    </AdminPageTitleProvider>
  );
}
