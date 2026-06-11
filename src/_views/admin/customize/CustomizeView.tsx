"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { LoginSlideAdmin } from "@/components/admin/LoginSlideAdmin";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventNav } from "@/hooks/useEventNav";

export function CustomizeView() {
  const { nav } = useEventNav();

  return (
    <PermissionGuard permission="customize.branding">
      <AppShell title="Customize" nav={nav}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event branding</CardTitle>
              <CardDescription>
                Tailor how this event looks to participants — starting with the sign-in experience.
              </CardDescription>
            </CardHeader>
          </Card>
          <LoginSlideAdmin />
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
