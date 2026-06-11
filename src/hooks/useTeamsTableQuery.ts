"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useEventSlug } from "@/hooks/useEventSlug";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResponse } from "@/lib/pagination";
import { useTeamsTableStore } from "@/stores/teamsTableStore";
import type { TeamRow } from "@/types/teams";

export const teamsTableQueryKey = (eventSlug: string, params: Record<string, unknown>) =>
  ["event-teams-table", eventSlug, params] as const;

function buildTeamsQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export function useTeamsTableQueryParams() {
  const page = useTeamsTableStore((s) => s.page);
  const limit = useTeamsTableStore((s) => s.limit);
  const search = useTeamsTableStore((s) => s.search);
  const sortBy = useTeamsTableStore((s) => s.sortBy);
  const sortOrder = useTeamsTableStore((s) => s.sortOrder);
  const debouncedSearch = useDebounce(search, 400);

  return useMemo(
    () => ({
      page,
      limit,
      q: debouncedSearch || undefined,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, sortBy, sortOrder],
  );
}

export function useTeamsTableQuery() {
  const eventSlug = useEventSlug();
  const params = useTeamsTableQueryParams();

  return useQuery({
    queryKey: teamsTableQueryKey(eventSlug, params),
    queryFn: async () => {
      const qs = buildTeamsQueryString(params);
      return apiFetch<PaginatedResponse<TeamRow>>(eventSlug, `/teams?${qs}`);
    },
  });
}

function invalidateTeams(queryClient: ReturnType<typeof useQueryClient>, eventSlug: string) {
  void queryClient.invalidateQueries({ queryKey: ["event-teams-table", eventSlug] });
  void queryClient.invalidateQueries({ queryKey: ["teams", eventSlug] });
}

export function useCreateTeamMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { letter: string; name: string; color: string }) =>
      apiFetch<{ team: TeamRow }>(eventSlug, "/teams", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateTeams(queryClient, eventSlug),
  });
}

export function useUpdateTeamMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      letter?: string;
      name?: string;
      color?: string;
    }) =>
      apiFetch<{ team: TeamRow }>(eventSlug, `/teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateTeams(queryClient, eventSlug),
  });
}

export function useDeleteTeamMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(eventSlug, `/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateTeams(queryClient, eventSlug),
  });
}
