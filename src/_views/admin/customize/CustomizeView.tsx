"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { LoginSlideAdmin } from "@/components/admin/LoginSlideAdmin";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomizeView() {
  return (
    <PermissionGuard permission="customize.branding" embedded>
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
    </PermissionGuard>
  );
}
