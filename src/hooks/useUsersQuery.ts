"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useEventSlug } from "@/hooks/useEventSlug";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResponse } from "@/lib/pagination";
import { useUsersTableStore } from "@/stores/usersTableStore";
import type { CheckInUserPayload } from "@/lib/check-in";
import type { EventUserRow } from "@/types/users";

export const usersQueryKey = (eventSlug: string, params: Record<string, unknown>) =>
  ["event-users", eventSlug, params] as const;

function buildUsersQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export function useUsersQueryParams() {
  const page = useUsersTableStore((s) => s.page);
  const limit = useUsersTableStore((s) => s.limit);
  const search = useUsersTableStore((s) => s.search);
  const role = useUsersTableStore((s) => s.role);
  const checkedIn = useUsersTableStore((s) => s.checkedIn);
  const teamId = useUsersTableStore((s) => s.teamId);
  const sortBy = useUsersTableStore((s) => s.sortBy);
  const sortOrder = useUsersTableStore((s) => s.sortOrder);
  const debouncedSearch = useDebounce(search, 400);

  return useMemo(
    () => ({
      page,
      limit,
      q: debouncedSearch || undefined,
      role: role === "all" ? undefined : role,
      checkedIn: checkedIn === "all" ? undefined : checkedIn,
      teamId: teamId === "all" ? undefined : teamId,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, role, checkedIn, teamId, sortBy, sortOrder],
  );
}

export function useUsersQuery() {
  const eventSlug = useEventSlug();
  const params = useUsersQueryParams();

  return useQuery({
    queryKey: usersQueryKey(eventSlug, params),
    queryFn: async () => {
      const qs = buildUsersQueryString(params);
      return apiFetch<PaginatedResponse<EventUserRow>>(eventSlug, `/users?${qs}`);
    },
  });
}

export function useCreateUserMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      email: string;
      username?: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      permissionProfile?: string;
      role?: string;
      password?: string;
    }) =>
      apiFetch<{
        user: EventUserRow;
        emailQueued: boolean;
        permissionProfile: string;
      }>(eventSlug, "/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-users", eventSlug] });
    },
  });
}

export function useInvalidateUsers() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: ["event-users", eventSlug] });
}

export function useCheckInUserMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, email }: { userId: string; email?: string }) =>
      apiFetch<{
        user: CheckInUserPayload;
        alreadyCheckedIn?: boolean;
      }>(eventSlug, `/users/${userId}/check-in`, {
        method: "PATCH",
        body: JSON.stringify(email ? { email } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-users", eventSlug] });
      void queryClient.invalidateQueries({ queryKey: ["teams", eventSlug] });
    },
  });
}

export function useUncheckInUserMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{
        user: CheckInUserPayload;
        alreadyUnchecked?: boolean;
      }>(eventSlug, `/users/${userId}/check-in`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-users", eventSlug] });
    },
  });
}

export function useTeamsQuery() {
  const eventSlug = useEventSlug();

  return useQuery({
    queryKey: ["teams", eventSlug],
    queryFn: () =>
      apiFetch<{ teams: Array<{ id: string; letter: string; name: string }> }>(eventSlug, "/teams"),
  });
}
