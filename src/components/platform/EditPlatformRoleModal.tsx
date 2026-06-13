"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import {
  PERMISSION_CATALOG,
  ROLE_ASSIGNABLE_PERMISSIONS,
  hasWildcardAccess,
  type Permission,
  type RolePermission,
} from "@/lib/permissions/catalog";
import { roleIsDeletable, roleIsEditable } from "@/lib/platform-roles.shared";
import type { PlatformRoleRow } from "@/lib/platform-roles.types";
import { platformApiFetch } from "@/lib/platform-api-client";
import { toastError } from "@/lib/toast";

const ASSIGNABLE_CATALOG = PERMISSION_CATALOG.filter((group) => group.id !== "platform");

interface EditPlatformRoleModalProps {
  open: boolean;
  role: PlatformRoleRow | null;
  create?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

function groupSelectedCount(group: (typeof ASSIGNABLE_CATALOG)[number], selected: Permission[]) {
  return group.permissions.filter((entry) => selected.includes(entry.permission)).length;
}

export function EditPlatformRoleModal({
  open,
  role,
  create = false,
  onClose,
  onSaved,
  onDeleted,
}: EditPlatformRoleModalProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Permission[]>([]);
  const [useWildcard, setUseWildcard] = useState(false);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState(ASSIGNABLE_CATALOG[0]?.id ?? "users");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (create) {
      setName("");
      setSelected([]);
      setUseWildcard(false);
      setSearch("");
      setGroupId(ASSIGNABLE_CATALOG[0]?.id ?? "users");
      return;
    }
    if (!role) return;
    setName(role.name);
    const wildcard = hasWildcardAccess(role.permissions);
    setUseWildcard(wildcard);
    setSelected(
      wildcard
        ? []
        : role.permissions.filter(
            (p): p is Permission => p !== "*" && ROLE_ASSIGNABLE_PERMISSIONS.includes(p as Permission),
          ),
    );
    setSearch("");
    setGroupId(ASSIGNABLE_CATALOG[0]?.id ?? "users");
  }, [open, create, role]);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ASSIGNABLE_CATALOG;
    return ASSIGNABLE_CATALOG.filter(
      (group) =>
        group.label.toLowerCase().includes(q) ||
        group.permissions.some(
          (entry) =>
            entry.label.toLowerCase().includes(q) ||
            entry.permission.toLowerCase().includes(q),
        ),
    );
  }, [search]);

  const activeGroup =
    visibleGroups.find((group) => group.id === groupId) ?? visibleGroups[0] ?? null;

  const togglePermission = (permission: Permission) => {
    setSelected((current) =>
      current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission],
    );
  };

  const save = async () => {
    setLoading(true);
    const permissions: RolePermission[] = useWildcard ? ["*"] : selected;
    try {
      if (create) {
        await platformApiFetch("/api/fg-admin/roles", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), permissions }),
        });
      } else if (role) {
        await platformApiFetch(`/api/fg-admin/roles/${role.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), permissions }),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        "Failed to save role",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!role || !roleIsDeletable(role)) return;
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setLoading(true);
    try {
      await platformApiFetch(`/api/fg-admin/roles/${role.id}`, { method: "DELETE" });
      onDeleted?.();
      onClose();
    } catch (err) {
      toastError(
        "Failed to delete role",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  const editable = create || (role ? roleIsEditable(role) : false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={create ? "Add role" : "Edit role"}
      description="Roles are permission bundles assigned to members. Authorization always checks individual permissions."
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="role-name">Name</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editable || loading}
            required
          />
        </div>

        {editable && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useWildcard}
              onChange={(e) => setUseWildcard(e.target.checked)}
              disabled={loading}
            />
            Full access (wildcard)
          </label>
        )}

        {editable && !useWildcard && (
          <div className="grid gap-4 lg:grid-cols-[12rem_1fr]">
            <div className="space-y-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions…"
              />
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                {visibleGroups.map((group) => {
                  const count = groupSelectedCount(group, selected);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setGroupId(group.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                        activeGroup?.id === group.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <span>{group.label}</span>
                      {count > 0 && (
                        <span className="text-xs opacity-80">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {activeGroup?.permissions.map((entry) => (
                <label key={entry.permission} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.includes(entry.permission)}
                    onChange={() => togglePermission(entry.permission)}
                    disabled={loading}
                  />
                  <span>
                    <span className="font-medium">{entry.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {entry.permission}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {!editable && role && (
          <p className="text-sm text-muted-foreground">
            This system role cannot be edited here.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <div>
            {!create && role && roleIsDeletable(role) && (
              <Button type="button" variant="outline" disabled={loading} onClick={() => void remove()}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            {editable && (
              <Button
                type="button"
                disabled={loading || !name.trim() || (!useWildcard && selected.length === 0)}
                onClick={() => void save()}
              >
                {loading ? "Saving…" : create ? "Create role" : "Save changes"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
