"use client";

import { useMemo } from "react";

interface NavItem {
  href: string;
  label: string;
}

export function usePlatformNav(event?: { slug: string; title: string } | null) {
  return useMemo(() => {
    const nav: NavItem[] = [{ href: "/fg-admin", label: "Events" }];
    if (event) {
      nav.push({ href: `/fg-admin/${event.slug}`, label: event.title });
    }
    return nav;
  }, [event?.slug, event?.title]);
}
