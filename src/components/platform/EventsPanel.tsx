"use client";

import { useCallback, useEffect, useState } from "react";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PaginatedResponse } from "@/lib/pagination";
import type { PlatformEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { EventGridCard } from "@/components/platform/EventGridCard";
import { EventGridSkeleton } from "@/components/platform/EventGridSkeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { toastError } from "@/lib/toast";

const SORT_OPTIONS = [
  { value: "date:desc", label: "Date (newest)" },
  { value: "date:asc", label: "Date (oldest)" },
  { value: "title:asc", label: "Title (A–Z)" },
  { value: "title:desc", label: "Title (Z–A)" },
  { value: "status:asc", label: "Status" },
  { value: "createdAt:desc", label: "Recently created" },
] as const;

interface EventsPanelProps {
  onCreateClick: () => void;
  refreshKey?: number;
}

export function EventsPanel({ onCreateClick, refreshKey = 0 }: EventsPanelProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("date:desc");
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [result, setResult] = useState<PaginatedResponse<PlatformEvent> | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const [sortBy, sortOrder] = sort.split(":") as [string, "asc" | "desc"];

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
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (status !== "all") params.set("status", status);

      const data = await platformApiFetch<PaginatedResponse<PlatformEvent>>(
        `/api/fg-admin/events?${params.toString()}`,
      );
      setResult(data);
    } catch (err) {
      toastError(
        "Failed to load events",
        err instanceof Error ? err.message : undefined,
      );
      setResult(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, status, sortBy, sortOrder, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sort]);

  const events = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Search and open an event to manage activities, cover image, and platform settings.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={onCreateClick}>Create event</Button>
        </div>
      </CardHeader>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or slug…"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="LIVE">Live</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {loadFailed && !loading ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <p className="font-medium text-foreground">Could not load events</p>
            <p className="mt-1 text-sm text-muted-foreground">Try again in a moment.</p>
            <Button className="mt-4" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <EventGridSkeleton count={limit} />
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <p className="font-medium text-foreground">No events found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedSearch || status !== "all"
                ? "Try a different search or filter."
                : "Create your first event to get started."}
            </p>
            {!debouncedSearch && status === "all" && (
              <Button className="mt-4" onClick={onCreateClick}>
                Create event
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, index) => (
                <EventGridCard
                  key={event.id}
                  event={event}
                  fallbackIndex={(page - 1) * limit + index}
                />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </Card>
  );
}
