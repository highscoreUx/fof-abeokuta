"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { SponsorBars } from "@/components/layout/SponsorBars";

interface NavItem {
  href: string;
  label: string;
}

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  nav: NavItem[];
  showSponsors?: boolean;
}

export function AppShell({ children, title, nav, showSponsors = false }: AppShellProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Friends of Figma Abeokuta</p>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.firstName} {user?.lastName} ({user?.role})
            </span>
            <button onClick={() => logout()} className="text-sm text-primary underline">
              Logout
            </button>
          </div>
        </div>
        <nav className="mx-auto mt-4 flex max-w-7xl gap-4 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-6 pb-24">{children}</main>
      {showSponsors && <SponsorBars />}
    </div>
  );
}
