"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { BrandMark } from "@/components/layout/BrandMark";
import { MobileBottomTabBar, type MobileBottomTab } from "@/components/layout/MobileBottomTabBar";
import { SponsorBars } from "@/components/layout/SponsorBars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { navTransitionTypes } from "@/lib/nav-transition";

export interface NavItem {
  href: string;
  label: string;
}

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  nav: NavItem[];
  showSponsors?: boolean;
  contentClassName?: string;
  /** Hide the large mobile page title when the view renders its own heading. */
  hideMobileTitle?: boolean;
  /** Native-style bottom tabs on mobile (lg:hidden). Hides the mobile drawer nav. */
  mobileBottomTabs?: MobileBottomTab[];
  activeBottomTab?: string;
  /** Hide the sticky app header on mobile (e.g. immersive chat thread). */
  hideMobileHeader?: boolean;
  /** Hide bottom tabs on mobile while keeping them configured (e.g. inside a chat). */
  hideMobileBottomTabs?: boolean;
  /** Remove main padding on mobile for edge-to-edge screens. */
  mobileEdgeToEdge?: boolean;
}

function resolveActiveHref(pathname: string, nav: NavItem[]) {
  return [...nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;
}

export function AppShell({
  children,
  title,
  nav,
  showSponsors = false,
  contentClassName,
  hideMobileTitle = false,
  mobileBottomTabs,
  activeBottomTab,
  hideMobileHeader = false,
  hideMobileBottomTabs = false,
  mobileEdgeToEdge = false,
}: AppShellProps) {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname, nav);
  const { user, logout } = useAuth();
  const hasMobileBottomTabs = Boolean(mobileBottomTabs?.length) && !hideMobileBottomTabs;

  const navHrefs = [
    ...nav.map((item) => item.href),
    ...(mobileBottomTabs?.map((tab) => tab.href).filter(Boolean) as string[] ?? []),
  ];

  const navLink = (item: NavItem) => {
    const active = activeHref === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        transitionTypes={navTransitionTypes(pathname, item.href, navHrefs)}
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
        <aside
          className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"
          style={{ viewTransitionName: "app-sidebar" }}
        >
          <div className="border-b border-border p-5">
            <BrandMark />
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">{nav.map((item) => navLink(item))}</nav>
          <div className="border-t border-border p-4">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <Badge variant="muted" className="max-w-[8rem] truncate uppercase">
                {user?.permissionProfile}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                Log out
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={cn(
              "sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md",
              hideMobileHeader && "hidden lg:block",
            )}
            style={{ viewTransitionName: "site-header" }}
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 lg:hidden">
                  <BrandMark compact />
                </div>
                <div className="hidden min-w-0 lg:block">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="muted" className="hidden uppercase sm:inline-flex">
                  {user?.permissionProfile}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className={cn(hasMobileBottomTabs && "text-xs")}
                >
                  Log out
                </Button>
              </div>
            </div>
          </header>

          <main
            className={cn(
              "flex-1 lg:px-8 lg:py-8",
              mobileEdgeToEdge ? "px-0 py-0 lg:px-8 lg:py-8" : "px-4 py-4 sm:px-6 sm:py-6",
              hasMobileBottomTabs && "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
            )}
          >
            <div
              className={cn(
                "mx-auto w-full",
                mobileEdgeToEdge ? "max-w-none lg:max-w-6xl" : "max-w-6xl",
                contentClassName,
              )}
            >
              {!hideMobileTitle && (
                <div className="mb-4 lg:mb-6 lg:hidden">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
                </div>
              )}
              {children}
            </div>
          </main>

          {showSponsors && <SponsorBars />}

          {hasMobileBottomTabs && mobileBottomTabs && activeBottomTab && (
            <MobileBottomTabBar
              tabs={mobileBottomTabs}
              activeTab={activeBottomTab}
              navHrefs={navHrefs}
            />
          )}
        </div>
      </div>
    </div>
  );
}
