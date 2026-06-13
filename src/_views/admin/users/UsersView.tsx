"use client";

import { useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AddUserModal } from "@/components/admin/AddUserModal";
import { BulkImportModal } from "@/components/admin/BulkImportModal";
import { UsersTable } from "@/components/admin/UsersTable";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHasPermission } from "@/hooks/useHasPermission";

export function UsersView() {
  const canImportUsers = useHasPermission("user.import");
  const canCreateUsers = useHasPermission("user.create");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <PermissionGuard permission="user.list" embedded>
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
                Search, filter, and manage event participants and staff. New accounts receive sign-in
                details by email.
              </CardDescription>
            </div>
            {(canImportUsers || canCreateUsers) && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {canImportUsers && (
                  <Button variant="outline" onClick={() => setBulkOpen(true)}>
                    Bulk add
                  </Button>
                )}
                {canCreateUsers && (
                  <Button onClick={() => setAddOpen(true)}>Add user</Button>
                )}
              </div>
            )}
          </CardHeader>

          <UsersTable />
        </Card>
      </div>

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(payload) =>
          showToast(
            payload.emailQueued
              ? `Created ${payload.email} (${payload.permissionProfile}) — sign-in details emailed`
              : `Created ${payload.email} (${payload.permissionProfile})`,
          )
        }
      />
      {canImportUsers && (
        <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
      )}
    </PermissionGuard>
  );
}
