"use client";

import { usePathname } from "next/navigation";
import { usePlatformAuthGuard } from "@/hooks/usePlatformAuthGuard";

export default function FgAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/fg-admin/access-denied";
  usePlatformAuthGuard(!isPublic);
  return children;
}
