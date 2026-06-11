"use client";

import { createContext, useContext } from "react";

export interface EventScopeValue {
  eventSlug: string;
  /** `""` for root routes (`/admin`), `"/slug"` for slug routes (`/slug/admin`) */
  pathPrefix: string;
}

const EventScopeContext = createContext<EventScopeValue | null>(null);

export function EventScopeProvider({
  eventSlug,
  pathPrefix,
  children,
}: EventScopeValue & { children: React.ReactNode }) {
  return (
    <EventScopeContext.Provider value={{ eventSlug, pathPrefix }}>
      {children}
    </EventScopeContext.Provider>
  );
}

export function useEventScope(): EventScopeValue {
  const ctx = useContext(EventScopeContext);
  if (!ctx) {
    throw new Error("useEventScope must be used within EventScopeProvider");
  }
  return ctx;
}
