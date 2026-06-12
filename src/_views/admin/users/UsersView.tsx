"use client";

import { useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AddUserModal } from "@/components/admin/AddUserModal";
import { BulkImportModal } from "@/components/admin/BulkImportModal";
import { UsersTable } from "@/components/admin/UsersTable";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventNav } from "@/hooks/useEventNav";

export function UsersView() {
  const { nav } = useEventNav();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <PermissionGuard permission="user.list">
      <AppShell title="User Management" nav={nav}>
        <div className="space-y-4">
          {toast && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
              {toast}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Search, filter, and manage event participants and staff. Share temporary passwords
                  when creating accounts.
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="outline" onClick={() => setBulkOpen(true)}>
                  Bulk add
                </Button>
                <Button onClick={() => setAddOpen(true)}>Add user</Button>
              </div>
            </CardHeader>

            <UsersTable />
          </Card>
        </div>

        <AddUserModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={(credentials) =>
            showToast(
              `Created ${credentials.email} (${credentials.permissionProfile}) — temp password: ${credentials.password}`,
            )
          }
        />
        <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
      </AppShell>
    </PermissionGuard>
  );
}
