"use client";

import { AccessDeniedPanel } from "@/components/auth/AccessDeniedPanel";
import { AuthLoadingPanel } from "@/components/auth/AuthLoadingPanel";
import { usePlatformAuthState } from "@/hooks/usePlatformAuthState";

export default function FgAdminLayout({ children }: { children: React.ReactNode }) {
  const status = usePlatformAuthState();

  if (status === "loading" || status === "login_required") {
    return <AuthLoadingPanel />;
  }

  if (status === "access_denied") {
    return <AccessDeniedPanel context="platform" />;
  }

  return children;
}
