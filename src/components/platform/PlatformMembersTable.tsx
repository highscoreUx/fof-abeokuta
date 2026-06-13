"use client";

import { useCallback, useEffect, useState } from "react";
import { EditPlatformMemberModal } from "@/components/platform/EditPlatformMemberModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { toastError, toastSuccess } from "@/lib/toast";
import type { GlobalMembersAudience } from "@/lib/member-access";
import { usePlatformRoles } from "@/hooks/usePlatformRoles";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PaginatedResponse } from "@/lib/pagination";
import type { PlatformMemberRow } from "@/types/members";

type MembersSortField = "firstName" | "lastName" | "username" | "email" | "createdAt";

interface PlatformMembersTableProps {
  audience: GlobalMembersAudience;
  refreshKey?: number;
  emptyLabel: string;
  countLabel: string;
}

export function PlatformMembersTable({
  audience,
  refreshKey = 0,
  emptyLabel,
  countLabel,
}: PlatformMembersTableProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<MembersSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [result, setResult] = useState<PaginatedResponse<PlatformMemberRow> | null>(null);
  const [editMember, setEditMember] = useState<PlatformMemberRow | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const { roles } = usePlatformRoles(refreshKey);
  const profileOptions =
    audience === "staff"
      ? roles.filter((profile) => profile.slug !== "participant")
      : roles;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (audience === "staff") params.set("view", "staff");
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (role !== "all") params.set("role", role);

      const data = await platformApiFetch<PaginatedResponse<PlatformMemberRow>>(
        `/api/fg-admin/members?${params.toString()}`,
      );
      setResult(data);
    } catch {
      setResult(null);
      toastError("Failed to load members");
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [audience, page, limit, debouncedSearch, role, sortBy, sortOrder, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, sortBy, sortOrder, limit, audience]);

  const toggleSort = (field: MembersSortField) => {
    if (sortBy === field) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "firstName" || field === "username" ? "asc" : "desc");
    }
  };

  const members = result?.data ?? [];

  const resetPassword = async (member: PlatformMemberRow) => {
    if (!member.email) {
      toastError("No email on account");
      return;
    }
    setResettingId(member.id);
    try {
      const result = await platformApiFetch<{ emailQueued: boolean; email: string }>(
        `/api/fg-admin/members/${member.id}/reset-password`,
        { method: "POST" },
      );
      toastSuccess(
        result.emailQueued
          ? `Password reset email sent to ${result.email}`
          : "Password reset (email queue not configured)",
      );
    } catch (err) {
      toastError(
        "Failed to reset password",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setResettingId(null);
    }
  };

  const SortableHeader = ({ field, label }: { field: MembersSortField; label: string }) => {
    const active = sortBy === field;
    return (
      <th className="px-4 py-3 text-left">
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
          {active && <span aria-hidden>{sortOrder === "asc" ? "↑" : "↓"}</span>}
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, username, or email…"
        />
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All profiles</option>
          {profileOptions.map((profile) => (
            <option key={profile.slug} value={profile.slug}>
              {profile.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {result ? (
            <>
              <span className="font-medium text-foreground">{result.total}</span> {countLabel}
            </>
          ) : (
            "Loading…"
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide">Rows</span>
          <Select
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-8 w-20"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <SortableHeader field="firstName" label="Name" />
                <SortableHeader field="username" label="Username" />
                <SortableHeader field="email" label="Email" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Access
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Events
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-border/60">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {!loading && loadFailed && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <p>Could not load members.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
                      Retry
                    </Button>
                  </td>
                </tr>
              )}
              {!loading && !loadFailed && members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {emptyLabel}
                  </td>
                </tr>
              )}
              {!loading &&
                !loadFailed &&
                members.map((member, index) => (
                  <tr
                    key={member.id}
                    className={cn(
                      "border-b border-border/60 transition-colors hover:bg-primary/5",
                      index % 2 === 1 ? "bg-muted/35" : "bg-card",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {member.username}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="muted" className="max-w-[10rem] truncate uppercase">
                        {member.permissionProfile}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.eventCount}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu
                        align="end"
                        trigger={
                          <Button size="sm" variant="outline" disabled={resettingId === member.id}>
                            Actions ▾
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => setEditMember(member)}>
                          Edit
                        </DropdownMenuItem>
                        {member.email && (
                          <DropdownMenuItem onClick={() => void resetPassword(member)}>
                            Reset password
                          </DropdownMenuItem>
                        )}
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {result && (
        <Pagination
          currentPage={page}
          totalPages={result.totalPages}
          totalItems={result.total}
          itemsPerPage={limit}
          onPageChange={setPage}
        />
      )}

      <EditPlatformMemberModal
        open={editMember !== null}
        member={editMember}
        onClose={() => setEditMember(null)}
        onUpdated={() => void load()}
      />
    </div>
  );
}
