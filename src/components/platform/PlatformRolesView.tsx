"use client";

import { useMemo, useState } from "react";
import { EditPlatformRoleModal } from "@/components/platform/EditPlatformRoleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlatformRoles } from "@/hooks/usePlatformRoles";
import { hasWildcardAccess } from "@/lib/permissions/catalog";
import { roleIsDeletable, roleIsEditable } from "@/lib/platform-roles.shared";
import type { PlatformRoleRow } from "@/lib/platform-roles.types";

function permissionCount(role: PlatformRoleRow) {
  if (hasWildcardAccess(role.permissions)) return "Full access";
  return `${role.permissions.length} permissions`;
}

export function PlatformRolesView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { roles, loading, error } = usePlatformRoles(refreshKey);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<PlatformRoleRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.slug.toLowerCase().includes(q),
    );
  }, [roles, search]);

  const openCreate = () => {
    setCreating(true);
    setEditingRole(null);
    setEditorOpen(true);
  };

  const openEdit = (role: PlatformRoleRow) => {
    setCreating(false);
    setEditingRole(role);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setCreating(false);
    setEditingRole(null);
  };

  const bump = () => setRefreshKey((key) => key + 1);

  return (
    <>
      <Card className="p-0 shadow-none">
        <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Roles</h2>
            <p className="text-sm text-muted-foreground">
              Permission bundles for members and event staff. Members pick up changes on next sign-in.
            </p>
          </div>
          <Button className="shrink-0" onClick={openCreate}>
            Add role
          </Button>
        </div>

        <div className="space-y-4 p-6 pt-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles…"
            className="max-w-sm"
          />

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading roles…</p>
          ) : error ? (
            <p className="text-sm text-danger">Failed to load roles.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Slug</th>
                    <th className="px-4 py-3 text-left font-medium">Access</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((role) => (
                    <tr key={role.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{role.name}</span>
                          {role.isSystem && <Badge variant="muted">System</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{role.slug}</td>
                      <td className="px-4 py-3 text-muted-foreground">{permissionCount(role)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => openEdit(role)}>
                          {roleIsEditable(role) ? "Edit" : "View"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <EditPlatformRoleModal
        open={editorOpen}
        role={editingRole}
        create={creating}
        onClose={closeEditor}
        onSaved={bump}
        onDeleted={bump}
      />
    </>
  );
}
