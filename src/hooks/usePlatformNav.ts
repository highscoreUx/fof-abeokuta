"use client";

import { useMemo } from "react";
import { FG_ADMIN_DIAGNOSTICS, FG_ADMIN_EVENTS, FG_ADMIN_MEMBERS, FG_ADMIN_ROLES } from "@/lib/fg-admin-routes";

interface NavItem {
  href: string;
  label: string;
}

export function usePlatformNav() {
  return useMemo<NavItem[]>(
    () => [
      { href: FG_ADMIN_EVENTS, label: "Events" },
      { href: FG_ADMIN_MEMBERS, label: "Members" },
      { href: FG_ADMIN_ROLES, label: "Roles" },
      { href: FG_ADMIN_DIAGNOSTICS, label: "Diagnostics" },
    ],
    [],
  );
}
