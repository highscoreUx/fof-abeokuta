"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCheckInModal } from "@/components/admin/UserCheckInModal";
import { ChangeEventRoleModal } from "@/components/platform/ChangeEventRoleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import type { CommunityAudience } from "@/lib/community-audience";
import {
  COMMUNITY_STAFF_PROFILE_SLUGS,
  EVENT_SCOPED_STAFF_PROFILE_SLUGS,
} from "@/lib/community-audience";
import { cn } from "@/lib/cn";
import { usePlatformRoles } from "@/hooks/usePlatformRoles";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PaginatedResponse } from "@/lib/pagination";
import type { EventUserRow } from "@/types/users";

type UsersSortField = "firstName" | "lastName" | "username" | "createdAt" | "checkedInAt";
type CheckedInFilter = "all" | "yes" | "no";

interface TeamOption {
  id: string;
  letter: string;
  name: string;
}

interface PlatformCommunityUsersTableProps {
  eventId: string;
  audience: CommunityAudience;
  refreshKey?: number;
  emptyLabel: string;
  countLabel: string;
}

function RowActionsMenu({
  user,
  busy,
  canChangeRole,
  onCheckIn,
  onDetails,
  onChangeRole,
}: {
  user: EventUserRow;
  busy: boolean;
  canChangeRole: boolean;
  onCheckIn: () => void;
  onDetails: () => void;
  onChangeRole: () => void;
}) {
  return (
    <DropdownMenu
      align="end"
      trigger={
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 px-0"
          disabled={busy}
          aria-label={`Actions for ${user.firstName} ${user.lastName}`}
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        </Button>
      }
    >
      <DropdownMenuItem onClick={onCheckIn}>
        {user.checkedInAt ? "Undo check-in" : "Check in"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onDetails}>Details</DropdownMenuItem>
      {canChangeRole && (
        <DropdownMenuItem onClick={onChangeRole}>Change role</DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}

export function PlatformCommunityUsersTable({
  eventId,
  audience,
  refreshKey = 0,
  emptyLabel,
  countLabel,
}: PlatformCommunityUsersTableProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | "all">("all");
  const [checkedIn, setCheckedIn] = useState<CheckedInFilter>("all");
  const [teamId, setTeamId] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<UsersSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<PaginatedResponse<EventUserRow> | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [detailsUser, setDetailsUser] = useState<EventUserRow | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<EventUserRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const { roles } = usePlatformRoles(refreshKey);
  const profileOptions =
    audience === "staff"
      ? roles.filter((profile) =>
          (COMMUNITY_STAFF_PROFILE_SLUGS as readonly string[]).includes(profile.slug),
        )
      : audience === "participants"
        ? roles.filter((profile) =>
            (["participant", ...EVENT_SCOPED_STAFF_PROFILE_SLUGS] as readonly string[]).includes(
              profile.slug,
            ),
          )
        : roles;

  const eventAccessOptions = profileOptions
    .filter((profile) => profile.slug !== "event_admin")
    .map((profile) => ({ slug: profile.slug, name: profile.name }));

  const loadTeams = useCallback(async () => {
    try {
      const data = await platformApiFetch<{ teams: TeamOption[] }>(
        `/api/fg-admin/events/${eventId}/teams`,
      );
      setTeams(data.teams);
    } catch {
      setTeams([]);
    }
  }, [eventId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        audience,
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (role !== "all") params.set("role", role);
      if (checkedIn !== "all") params.set("checkedIn", checkedIn);
      if (teamId !== "all") params.set("teamId", teamId);

      const data = await platformApiFetch<PaginatedResponse<EventUserRow>>(
        `/api/fg-admin/events/${eventId}/users?${params.toString()}`,
      );
      setResult(data);
    } catch {
      setResult(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [
    eventId,
    audience,
    page,
    limit,
    debouncedSearch,
    role,
    checkedIn,
    teamId,
    sortBy,
    sortOrder,
    refreshKey,
  ]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, checkedIn, teamId, sortBy, sortOrder, limit, audience]);

  const toggleSort = (field: UsersSortField) => {
    if (sortBy === field) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "firstName" || field === "username" ? "asc" : "desc");
    }
  };

  const toggleCheckIn = async (user: EventUserRow) => {
    if (!user.checkedInAt && (user.needsEmail || !user.email)) {
      setDetailsUser(user);
      return;
    }
    setTogglingId(user.id);
    try {
      await platformApiFetch(`/api/fg-admin/events/${eventId}/users/${user.id}/check-in`, {
        method: user.checkedInAt ? "DELETE" : "PATCH",
      });
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update check-in");
    } finally {
      setTogglingId(null);
    }
  };

  const canChangeEventRole = (user: EventUserRow) =>
    audience === "participants"
      ? user.isParticipantAccount !== false
      : Boolean(user.isEventScopedAccess);

  const users = result?.data ?? [];

  const SortableHeader = ({ field, label }: { field: UsersSortField; label: string }) => {
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
      <div
        className={cn(
          "grid gap-3 md:grid-cols-2",
          audience === "participants" ? "xl:grid-cols-4" : "xl:grid-cols-5",
        )}
      >
        <div className={audience === "participants" ? "md:col-span-2" : "xl:col-span-2"}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or username…"
          />
        </div>
        {audience !== "participants" && (
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All profiles</option>
            {profileOptions.map((profile) => (
              <option key={profile.slug} value={profile.slug}>
                {profile.name}
              </option>
            ))}
          </Select>
        )}
        <Select
          value={checkedIn}
          onChange={(e) => setCheckedIn(e.target.value as CheckedInFilter)}
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
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-border/60">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-danger">
                    Failed to load users
                  </td>
                </tr>
              )}
              {!loading && !error && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {emptyLabel}
                  </td>
                </tr>
              )}
              {!loading &&
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
                        {user.permissionProfile}
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
                      <RowActionsMenu
                        user={user}
                        busy={togglingId === user.id}
                        canChangeRole={canChangeEventRole(user)}
                        onCheckIn={() => void toggleCheckIn(user)}
                        onDetails={() => setDetailsUser(user)}
                        onChangeRole={() => setRoleChangeUser(user)}
                      />
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

      <UserCheckInModal
        open={detailsUser !== null}
        onClose={() => setDetailsUser(null)}
        user={detailsUser}
        platformEventId={eventId}
        onUpdated={() => void load()}
      />

      <ChangeEventRoleModal
        open={roleChangeUser !== null}
        onClose={() => setRoleChangeUser(null)}
        user={roleChangeUser}
        eventId={eventId}
        roleOptions={eventAccessOptions}
        onUpdated={() => void load()}
      />
    </div>
  );
}
