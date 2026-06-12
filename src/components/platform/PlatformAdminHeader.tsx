"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PlatformAdminHeaderProps {
  adminEmail?: string;
  onLogout: () => void;
  backHref?: string;
  action?: React.ReactNode;
}

export function PlatformAdminHeader({
  adminEmail,
  onLogout,
  backHref,
  action,
}: PlatformAdminHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="mb-1 inline-block text-sm text-muted-foreground hover:text-foreground"
            >
              ← All events
            </Link>
          )}
          <p className="text-sm font-semibold text-primary">Friends of Figma Abeokuta</p>
          <h1 className="text-2xl font-bold">Platform Admin</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {action}
          <span className="hidden text-sm text-muted-foreground sm:inline">{adminEmail}</span>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
