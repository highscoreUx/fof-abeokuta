"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navTransitionTypes } from "@/lib/nav-transition";

export interface MobileBottomTab {
  value: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

function AgendaIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 2.25 : 1.75}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 2.25 : 1.75}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function GalleryIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 2.25 : 1.75}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

export const MOBILE_BOTTOM_TAB_ICONS = {
  agenda: AgendaIcon,
  chat: ChatIcon,
  gallery: GalleryIcon,
} as const;

export function MobileBottomTabBar({
  tabs,
  activeTab,
  navHrefs,
}: {
  tabs: MobileBottomTab[];
  activeTab: string;
  navHrefs: string[];
}) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around">
        {tabs.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              transitionTypes={navTransitionTypes(pathname, tab.href, navHrefs)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-2 text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={cn(active && "scale-105")}>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
