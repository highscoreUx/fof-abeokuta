"use client";

import { useCallback, useMemo } from "react";
import { apiFetch, eventApiPath } from "@/lib/api-client";
import { useEventSlug } from "@/hooks/useEventSlug";

export function useEventApi() {
  const slug = useEventSlug();

  const path = useCallback((p: string) => eventApiPath(slug, p), [slug]);

  const api = useCallback(
    <T,>(apiPath: string, options?: Parameters<typeof apiFetch>[2]) =>
      apiFetch<T>(slug, apiPath, options),
    [slug],
  );

  return useMemo(() => ({ slug, path, api }), [slug, path, api]);
}
