"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ROLE_ASSIGNABLE_CATALOG,
  ROLE_ASSIGNABLE_PERMISSIONS,
  hasWildcardAccess,
  type Permission,
  type PermissionGroup,
} from "@/lib/permissions/catalog";
import { isNonEditableRoleSlug } from "@/lib/permissions/default-bundles";
import {
  useCreateEventUserRoleMutation,
  useDeleteEventUserRoleMutation,
  useUpdateEventUserRoleMutation,
} from "@/hooks/useEventUserRolesQuery";
import { slugifyEventUserRoleName } from "@/lib/event-user-role-slug";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { EventUserRoleRecord } from "@/types";

function groupSelectedCount(group: PermissionGroup, selected: Permission[]): number {
  return group.permissions.filter((entry) => selected.includes(entry.permission)).length;
}

function groupMatchesSearch(group: PermissionGroup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (group.label.toLowerCase().includes(q)) return true;
  return group.permissions.some(
    (entry) =>
      entry.label.toLowerCase().includes(q) || entry.permission.toLowerCase().includes(q),
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  role: EventUserRoleRecord | null;
  create?: boolean;
  onDeleted?: () => void;
};

export function EditEventUserRoleModal({ open, onClose, role, create = false, onDeleted }: Props) {
  const createRole = useCreateEventUserRoleMutation();
  const updateRole = useUpdateEventUserRoleMutation();
  const deleteRole = useDeleteEventUserRoleMutation();

  const [editName, setEditName] = useState("");
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);
  const [useWildcard, setUseWildcard] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(ROLE_ASSIGNABLE_CATALOG[0]?.id ?? "users");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (create) {
      setEditName("");
      setEditPermissions([]);
      setUseWildcard(false);
      setPermissionSearch("");
      setSelectedGroupId(ROLE_ASSIGNABLE_CATALOG[0]?.id ?? "users");
      return;
    }
    if (!role) return;
    setEditName(role.name);
    const wildcard = hasWildcardAccess(role.permissions);
    setUseWildcard(wildcard);
    setEditPermissions(
      wildcard ? [] : role.permissions.filter((p): p is Permission => p !== "*"),
    );
    setPermissionSearch("");
    setSelectedGroupId(ROLE_ASSIGNABLE_CATALOG[0]?.id ?? "users");
  }, [open, create, role]);

  const visibleGroups = useMemo(
    () => ROLE_ASSIGNABLE_CATALOG.filter((group) => groupMatchesSearch(group, permissionSearch)),
    [permissionSearch],
  );

  useEffect(() => {
    if (visibleGroups.length === 0) return;
    if (!visibleGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(visibleGroups[0].id);
    }
  }, [visibleGroups, selectedGroupId]);

  const selectedGroup =
    visibleGroups.find((group) => group.id === selectedGroupId) ??
    ROLE_ASSIGNABLE_CATALOG.find((group) => group.id === selectedGroupId) ??
    null;

  const visiblePermissions = useMemo(() => {
    if (!selectedGroup) return [];
    const q = permissionSearch.trim().toLowerCase();
    if (!q) return selectedGroup.permissions;
    return selectedGroup.permissions.filter(
      (entry) =>
        entry.label.toLowerCase().includes(q) || entry.permission.toLowerCase().includes(q),
    );
  }, [selectedGroup, permissionSearch]);

  const togglePermission = (permission: Permission) => {
    setEditPermissions((current) =>
      current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission],
    );
  };

  const setGroupPermissions = (group: PermissionGroup, enabled: boolean) => {
    const perms = group.permissions.map((entry) => entry.permission);
    setEditPermissions((current) => {
      if (enabled) return [...new Set([...current, ...perms])];
      return current.filter((p) => !perms.includes(p));
    });
  };

  const save = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    const permissions = useWildcard ? ["*"] : editPermissions;

    try {
      if (create) {
        await createRole.mutateAsync({
          name: trimmedName,
          slug: slugifyEventUserRoleName(trimmedName),
          permissions,
          fullAccess: useWildcard,
        });
      } else if (role) {
        await updateRole.mutateAsync({
          id: role.id,
          input: isNonEditableRoleSlug(role.slug)
            ? { permissions, fullAccess: useWildcard }
            : { name: trimmedName, permissions, fullAccess: useWildcard },
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save access profile");
    }
  };

  const remove = async () => {
    if (!role) return;
    if (!window.confirm(`Delete access profile "${role.name}"?`)) return;
    try {
      await deleteRole.mutateAsync(role.id);
      onClose();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete access profile");
    }
  };

  const selectedCount = useWildcard ? ROLE_ASSIGNABLE_PERMISSIONS.length : editPermissions.length;
  const isSaving = create ? createRole.isPending : updateRole.isPending;
  const showEditor = open && (create || role);
  const nameLocked = !create && role ? isNonEditableRoleSlug(role.slug) : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={create ? "Add access profile" : "Edit access profile"}
      description="Permissions define what people can do. Users must sign in again after changes."
      className="max-w-4xl"
    >
      {showEditor ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Display name</label>
            {nameLocked ? (
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                {role?.name}
              </p>
            ) : (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Door volunteer"
                autoFocus={create}
              />
            )}
          </div>

          <Card className="p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={useWildcard}
                disabled={nameLocked}
                onChange={(e) => setUseWildcard(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Full access</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Grants every permission for this event.
                </span>
              </span>
            </label>
          </Card>

          {!useWildcard ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Permissions</p>
                  <p className="text-sm text-muted-foreground">
                    Choose what this profile can do.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedCount} / {ROLE_ASSIGNABLE_PERMISSIONS.length} selected
                </p>
              </div>

              <Input
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                placeholder="Search permissions…"
              />

              <div className="grid overflow-hidden rounded-xl border border-border lg:grid-cols-[14rem_1fr]">
                <nav className="hidden border-r border-border bg-muted/30 lg:block lg:max-h-72 lg:overflow-y-auto">
                  <ul className="grid gap-0.5 p-2">
                    {visibleGroups.map((group) => {
                      const count = groupSelectedCount(group, editPermissions);
                      const active = group.id === selectedGroupId;
                      return (
                        <li key={group.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedGroupId(group.id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-foreground hover:bg-muted",
                            )}
                          >
                            <span className="truncate">{group.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {count}/{group.permissions.length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                <div className="max-h-72 overflow-y-auto p-4">
                  {selectedGroup ? (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{selectedGroup.label}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setGroupPermissions(selectedGroup, true)}
                          >
                            Select all
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setGroupPermissions(selectedGroup, false)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {visiblePermissions.map((entry) => (
                          <li key={entry.permission}>
                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/40">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={editPermissions.includes(entry.permission)}
                                onChange={() => togglePermission(entry.permission)}
                              />
                              <span>
                                <span className="block text-sm font-medium">{entry.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {entry.permission}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            {!create && role?.isDeletable ? (
              <Button
                type="button"
                variant="outline"
                className="mr-auto text-danger"
                onClick={remove}
                disabled={deleteRole.isPending}
              >
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : create ? "Create profile" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
