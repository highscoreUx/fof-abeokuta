"use client";

import { useMemo, useState } from "react";
import { EditEventUserRoleModal } from "@/components/admin/EditEventUserRoleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEventUserRolesQuery } from "@/hooks/useEventUserRolesQuery";
import { hasWildcardAccess } from "@/lib/permissions/catalog";
import type { EventUserRoleRecord } from "@/types";

function accessLabel(role: EventUserRoleRecord): string {
  if (hasWildcardAccess(role.permissions)) return "Full access";
  const count = role.permissions.filter((p) => p !== "*").length;
  return `${count} permission${count === 1 ? "" : "s"}`;
}

export function EventUserRolesSettings() {
  const { data, isLoading, error } = useEventUserRolesQuery();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<EventUserRoleRecord | null>(null);
  const [creating, setCreating] = useState(false);

  const roles = useMemo(() => {
    const list = data?.roles ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.slug.toLowerCase().includes(q) ||
        accessLabel(role).toLowerCase().includes(q),
    );
  }, [data?.roles, search]);

  const openCreate = () => {
    setEditingRole(null);
    setCreating(true);
    setModalOpen(true);
  };

  const openEdit = (role: EventUserRoleRecord) => {
    setEditingRole(role);
    setCreating(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
    setCreating(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Access profiles</CardTitle>
            <CardDescription>
              Named bundles of permissions. What matters is what each profile can do—not the label.
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreate}>
            Add profile
          </Button>
        </CardHeader>
        <div className="border-t border-border px-6 pb-6 pt-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search profiles…"
            className="mb-4 max-w-md"
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading access profiles…</p>
          ) : error ? (
            <p className="text-sm text-danger">Failed to load access profiles.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr
                      key={role.id}
                      className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}
                    >
                      <td className="px-4 py-3 font-medium">
                        {role.name}
                        {role.isSystem ? (
                          <Badge variant="muted" className="ml-2 text-[10px] uppercase">
                            System
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{accessLabel(role)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(role)}>
                          Edit
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

      <EditEventUserRoleModal
        open={modalOpen}
        onClose={closeModal}
        role={editingRole}
        create={creating}
      />
    </>
  );
}
