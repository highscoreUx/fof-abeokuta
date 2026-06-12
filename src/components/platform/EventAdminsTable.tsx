"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EventAdminDetailsModal,
  type EventAdminDetails,
} from "@/components/platform/EventAdminDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PaginatedResponse } from "@/lib/pagination";

type AdminSortField = "firstName" | "username" | "createdAt";

interface PlatformEventAdminRow extends EventAdminDetails {}

interface EventAdminsTableProps {
  eventId: string;
  eventSlug: string;
  refreshKey?: number;
}

export function EventAdminsTable({ eventId, eventSlug, refreshKey = 0 }: EventAdminsTableProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<AdminSortField>("firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaginatedResponse<PlatformEventAdminRow> | null>(null);
  const [detailsAdmin, setDetailsAdmin] = useState<PlatformEventAdminRow | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const data = await platformApiFetch<PaginatedResponse<PlatformEventAdminRow>>(
        `/api/fg-admin/events/${eventId}/users?${params.toString()}`,
      );
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, page, limit, debouncedSearch, sortBy, sortOrder, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortOrder, limit]);

  const toggleSort = (field: AdminSortField) => {
    if (sortBy === field) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const admins = result?.data ?? [];

  const SortHeader = ({ field, label }: { field: AdminSortField; label: string }) => (
    <th className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition",
          sortBy === field ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        {sortBy === field && <span aria-hidden>{sortOrder === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or username…"
        />
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
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

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {result ? (
            <>
              <span className="font-medium text-foreground">{result.total}</span> event staff
              {result.total === 1 ? " member" : " members"}
            </>
          ) : (
            "Loading…"
          )}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <SortHeader field="firstName" label="Name" />
                <SortHeader field="username" label="Username" />
                <SortHeader field="createdAt" label="Created" />
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-border/60">
                    <td colSpan={4} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {!loading && admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No event staff yet
                  </td>
                </tr>
              )}
              {!loading &&
                admins.map((admin, index) => (
                  <tr
                    key={admin.id}
                    className={cn(
                      "border-b border-border/60 transition-colors hover:bg-primary/5",
                      index % 2 === 1 ? "bg-muted/35" : "bg-card",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {admin.firstName} {admin.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {admin.username}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setDetailsAdmin(admin)}>
                        Details
                      </Button>
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

      <EventAdminDetailsModal
        open={detailsAdmin !== null}
        onClose={() => setDetailsAdmin(null)}
        admin={detailsAdmin}
        eventSlug={eventSlug}
      />
    </div>
  );
}
