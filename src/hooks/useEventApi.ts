"use client";

import { apiFetch, eventApiPath } from "@/lib/api-client";
import { useEventSlug } from "@/hooks/useEventSlug";

export function useEventApi() {
  const slug = useEventSlug();

  return {
    slug,
    path: (p: string) => eventApiPath(slug, p),
    api: <T>(path: string, options?: Parameters<typeof apiFetch>[2]) =>
      apiFetch<T>(slug, path, options),
  };
}
