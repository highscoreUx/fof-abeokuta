"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEventSlug } from "@/hooks/useEventSlug";
import { apiFetch } from "@/lib/api-client";
import type { EventUserRoleRecord } from "@/types";

export const eventUserRolesQueryKey = (eventSlug: string) =>
  ["event-user-roles", eventSlug] as const;

export function useEventUserRolesQuery(enabled = true) {
  const eventSlug = useEventSlug();

  return useQuery({
    queryKey: eventUserRolesQueryKey(eventSlug),
    queryFn: () =>
      apiFetch<{ roles: EventUserRoleRecord[] }>(eventSlug, "/event-user-roles"),
    enabled,
  });
}

export function useCreateEventUserRoleMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; slug?: string; permissions: string[]; fullAccess?: boolean }) =>
      apiFetch<{ role: EventUserRoleRecord }>(eventSlug, "/event-user-roles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventUserRolesQueryKey(eventSlug) });
    },
  });
}

export function useUpdateEventUserRoleMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; permissions?: string[]; fullAccess?: boolean };
    }) =>
      apiFetch<{ role: EventUserRoleRecord }>(eventSlug, `/event-user-roles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventUserRolesQueryKey(eventSlug) });
    },
  });
}

export function useDeleteEventUserRoleMutation() {
  const eventSlug = useEventSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(eventSlug, `/event-user-roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventUserRolesQueryKey(eventSlug) });
    },
  });
}
