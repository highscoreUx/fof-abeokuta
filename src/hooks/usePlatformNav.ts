"use client";

import { useMemo } from "react";

interface NavItem {
  href: string;
  label: string;
}

export function usePlatformNav() {
  return useMemo<NavItem[]>(() => [{ href: "/fg-admin", label: "Events" }], []);
}
