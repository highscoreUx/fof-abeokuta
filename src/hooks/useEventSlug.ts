"use client";

import { useEventScope } from "@/contexts/EventScopeContext";

export function useEventSlug(): string {
  return useEventScope().eventSlug;
}

export function useEventPathPrefix(): string {
  return useEventScope().pathPrefix;
}
