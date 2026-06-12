"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/layout/BrandMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { FG_ADMIN_DIAGNOSTICS, FG_ADMIN_EVENTS, FG_ADMIN_MEMBERS, FG_ADMIN_ROLES } from "@/lib/fg-admin-routes";
import { loginPath } from "@/lib/routes";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

interface NavItem {
  href: string;
  label: string;
}

interface PlatformAppShellProps {
  children: React.ReactNode;
  title: string;
  nav: NavItem[];
}

function resolveActiveHref(pathname: string, nav: NavItem[]) {
  return [...nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => {
      if (pathname === item.href) return true;
      if (item.href === FG_ADMIN_EVENTS) {
        return pathname.startsWith(`${FG_ADMIN_EVENTS}/`);
      }
      if (item.href === FG_ADMIN_MEMBERS || item.href === FG_ADMIN_ROLES || item.href === FG_ADMIN_DIAGNOSTICS) {
        return pathname === item.href || pathname.startsWith(`${item.href}/`);
      }
      return false;
    })?.href;
}

export function PlatformAppShell({ children, title, nav }: PlatformAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = resolveActiveHref(pathname, nav);
  const admin = usePlatformAuthStore((state) => state.admin);
  const clearAuth = usePlatformAuthStore((state) => state.clearAuth);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/fg-admin/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
    router.push(loginPath(FG_ADMIN_EVENTS));
  };

  const navLink = (item: NavItem, onNavigate?: () => void) => {
    const active = activeHref === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "block rounded-lg px-3 py-2 text-sm font-medium transition",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:flex">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="border-b border-border p-5">
            <BrandMark />
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">{nav.map((item) => navLink(item))}</nav>
          <div className="border-t border-border p-4">
            <p className="truncate text-sm font-medium text-foreground">{admin?.email}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <Badge variant="muted" className="max-w-[8rem] truncate">
                Platform
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => void logout()}>
                Log out
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted lg:hidden"
                  onClick={() => setMobileNavOpen((open) => !open)}
                  aria-label="Toggle navigation"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                <div className="min-w-0 lg:hidden">
                  <BrandMark compact />
                </div>
                <div className="hidden min-w-0 lg:block">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden items-center gap-3 sm:flex lg:hidden">
                  <Badge variant="muted">Platform</Badge>
                  <Button variant="outline" size="sm" onClick={() => void logout()}>
                    Log out
                  </Button>
                </div>
              </div>
            </div>

            {mobileNavOpen && (
              <div className="border-t border-border bg-card p-3 lg:hidden">
                <p className="mb-2 px-3 text-lg font-semibold text-foreground">{title}</p>
                <nav className="space-y-0.5">
                  {nav.map((item) => navLink(item, () => setMobileNavOpen(false)))}
                </nav>
              </div>
            )}
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-6xl">
              <div className="mb-6 lg:hidden">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
