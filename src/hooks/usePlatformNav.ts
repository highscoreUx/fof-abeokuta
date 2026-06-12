"use client";

import { useMemo } from "react";
import { FG_ADMIN_EVENTS, FG_ADMIN_MEMBERS } from "@/lib/fg-admin-routes";

interface NavItem {
  href: string;
  label: string;
}

export function usePlatformNav() {
  return useMemo<NavItem[]>(
    () => [
      { href: FG_ADMIN_EVENTS, label: "Events" },
      { href: FG_ADMIN_MEMBERS, label: "Members" },
    ],
    [],
  );
}
