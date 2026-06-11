"use client";

import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDeleteTeamMutation, useTeamsTableQuery } from "@/hooks/useTeamsTableQuery";
import { cn } from "@/lib/cn";
import { useTeamsTableStore, type TeamsSortField } from "@/stores/teamsTableStore";
import type { TeamRow } from "@/types/teams";

function SortableHeader({
  field,
  label,
  className,
}: {
  field: TeamsSortField;
  label: string;
  className?: string;
}) {
  const sortBy = useTeamsTableStore((s) => s.sortBy);
  const sortOrder = useTeamsTableStore((s) => s.sortOrder);
  const toggleSort = useTeamsTableStore((s) => s.toggleSort);
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

interface TeamsTableProps {
  onEdit: (team: TeamRow) => void;
}

export function TeamsTable({ onEdit }: TeamsTableProps) {
  const { data, isLoading, isFetching, error } = useTeamsTableQuery();
  const deleteTeam = useDeleteTeamMutation();

  const search = useTeamsTableStore((s) => s.search);
  const limit = useTeamsTableStore((s) => s.limit);
  const page = useTeamsTableStore((s) => s.page);
  const setSearch = useTeamsTableStore((s) => s.setSearch);
  const setLimit = useTeamsTableStore((s) => s.setLimit);
  const setPage = useTeamsTableStore((s) => s.setPage);

  const teams = data?.data ?? [];

  const handleDelete = async (team: TeamRow) => {
    const label = team.name || team.letter;
    if (
      !window.confirm(
        `Delete team "${label}"? Participants will be unassigned. Team chat and scores for this team will be removed.`,
      )
    ) {
      return;
    }
    try {
      await deleteTeam.mutateAsync(team.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete team");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code or name…"
          className="sm:max-w-sm"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {data ? (
              <>
                <span className="font-medium text-foreground">{data.total}</span> team
                {data.total === 1 ? "" : "s"}
              </>
            ) : (
              "Loading teams…"
            )}
          </span>
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
                <SortableHeader field="letter" label="Code" />
                <SortableHeader field="name" label="Name" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Color
                </th>
                <SortableHeader field="memberCount" label="Members" />
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-border/60">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {!isLoading && error && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-danger">
                    Failed to load teams
                  </td>
                </tr>
              )}
              {!isLoading && !error && teams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No teams match your search
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                teams.map((team, index) => (
                  <tr
                    key={team.id}
                    className={cn(
                      "border-b border-border/60 transition-colors hover:bg-primary/5",
                      index % 2 === 1 ? "bg-muted/35" : "bg-card",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex min-w-10 items-center justify-center rounded-lg px-2 py-1 text-xs font-bold text-white"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.letter}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{team.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <span
                          className="h-5 w-5 rounded border border-border"
                          style={{ backgroundColor: team.color }}
                        />
                        {team.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{team.memberCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(team)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          onClick={() => handleDelete(team)}
                          disabled={deleteTeam.isPending}
                        >
                          Delete
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
    </div>
  );
}
