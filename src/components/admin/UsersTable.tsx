"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useTeamsQuery, useUsersQuery } from "@/hooks/useUsersQuery";
import { cn } from "@/lib/cn";
import {
  useUsersTableStore,
  type UsersSortField,
} from "@/stores/usersTableStore";
import type { Role } from "@/types";

const ROLES: Array<Role | "all"> = ["all", "ADMIN", "STAFF", "JUDGE", "PARTICIPANT"];

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
        <Select value={role} onChange={(e) => setRole(e.target.value as Role | "all")}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "All roles" : r}
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
                <SortableHeader field="role" label="Role" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Password
                </th>
                <SortableHeader field="checkedInAt" label="Checked in" />
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
                      <Badge variant="muted" className="uppercase">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{user.teamLetter ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{user.password ?? "—"}</td>
                    <td className="px-4 py-3">
                      {user.checkedInAt ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <Badge variant="muted">No</Badge>
                      )}
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
    </div>
  );
}
