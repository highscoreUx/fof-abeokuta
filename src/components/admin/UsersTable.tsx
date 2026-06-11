"use client";

import { useState } from "react";
import { UserCheckInModal } from "@/components/admin/UserCheckInModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import {
  useCheckInUserMutation,
  useTeamsQuery,
  useUncheckInUserMutation,
  useUsersQuery,
} from "@/hooks/useUsersQuery";
import { cn } from "@/lib/cn";
import {
  useUsersTableStore,
  type UsersSortField,
} from "@/stores/usersTableStore";
import { useEventUserRolesQuery } from "@/hooks/useEventUserRolesQuery";
import type { EventUserRow } from "@/types/users";

function SortableHeader({
  field,
  label,
  className,
}: {
  field: UsersSortField;
  label: string;
  className?: string;
}) {
  const sortBy = useUsersTableStore((s) => s.sortBy);
  const sortOrder = useUsersTableStore((s) => s.sortOrder);
  const toggleSort = useUsersTableStore((s) => s.toggleSort);
  const active = sortBy === field;

  return (
    <th className={cn("px-4 py-3 text-left", className)}>
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
}

export function UsersTable() {
  const { data, isLoading, isFetching, error } = useUsersQuery();
  const { data: teamsData } = useTeamsQuery();
  const { data: rolesData } = useEventUserRolesQuery();
  const checkInUser = useCheckInUserMutation();
  const uncheckInUser = useUncheckInUserMutation();
  const [detailsUser, setDetailsUser] = useState<EventUserRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const search = useUsersTableStore((s) => s.search);
  const role = useUsersTableStore((s) => s.role);
  const checkedIn = useUsersTableStore((s) => s.checkedIn);
  const teamId = useUsersTableStore((s) => s.teamId);
  const limit = useUsersTableStore((s) => s.limit);
  const page = useUsersTableStore((s) => s.page);
  const setSearch = useUsersTableStore((s) => s.setSearch);
  const setRole = useUsersTableStore((s) => s.setRole);
  const setCheckedIn = useUsersTableStore((s) => s.setCheckedIn);
  const setTeamId = useUsersTableStore((s) => s.setTeamId);
  const setLimit = useUsersTableStore((s) => s.setLimit);
  const setPage = useUsersTableStore((s) => s.setPage);

  const users = data?.data ?? [];
  const teams = teamsData?.teams ?? [];
  const accessProfiles = rolesData?.roles ?? [];

  const toggleCheckIn = async (user: EventUserRow) => {
    setTogglingId(user.id);
    try {
      if (user.checkedInAt) {
        await uncheckInUser.mutateAsync(user.id);
      } else {
        await checkInUser.mutateAsync(user.id);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update check-in");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or username…"
          />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All profiles</option>
          {accessProfiles.map((profile) => (
            <option key={profile.id} value={profile.slug}>
              {profile.name}
            </option>
          ))}
        </Select>
        <Select
          value={checkedIn}
          onChange={(e) => setCheckedIn(e.target.value as "all" | "yes" | "no")}
        >
          <option value="all">All check-in</option>
          <option value="yes">Checked in</option>
          <option value="no">Not checked in</option>
        </Select>
        <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="all">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.letter} — {team.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {data ? (
            <>
              <span className="font-medium text-foreground">{data.total}</span> user
              {data.total === 1 ? "" : "s"}
            </>
          ) : (
            "Loading users…"
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
          {isFetching && !isLoading && <span className="text-xs">Refreshing…</span>}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <SortableHeader field="firstName" label="Name" />
                <SortableHeader field="username" label="Username" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Access
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Team
                </th>
                <SortableHeader field="checkedInAt" label="Checked in" />
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-border/60">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {!isLoading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-danger">
                    Failed to load users
                  </td>
                </tr>
              )}
              {!isLoading && !error && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No users match your filters
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                users.map((user, index) => (
                  <tr
                    key={user.id}
                    className={cn(
                      "border-b border-border/60 transition-colors hover:bg-primary/5",
                      index % 2 === 1 ? "bg-muted/35" : "bg-card",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {user.username}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="muted" className="max-w-[10rem] truncate uppercase">
                        {user.eventUserRoleName}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{user.teamLetter ?? "—"}</td>
                    <td className="px-4 py-3">
                      {user.checkedInAt ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <Badge variant="muted">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant={user.checkedInAt ? "outline" : "primary"}
                          className={user.checkedInAt ? "text-danger" : undefined}
                          onClick={() => void toggleCheckIn(user)}
                          disabled={togglingId === user.id}
                        >
                          {togglingId === user.id
                            ? "…"
                            : user.checkedInAt
                              ? "Undo"
                              : "Check in"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDetailsUser(user)}>
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages}
          totalItems={data.total}
          itemsPerPage={limit}
          onPageChange={setPage}
        />
      )}

      <UserCheckInModal
        open={detailsUser !== null}
        onClose={() => setDetailsUser(null)}
        user={detailsUser}
      />
    </div>
  );
}
