"use client";

import { LoginSlidePanel } from "@/components/auth/LoginSlidePanel";

interface LoginPageLayoutProps {
  slides: string[];
  children: React.ReactNode;
}

export function LoginPageLayout({ slides, children }: LoginPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fb] lg:flex-row lg:bg-gradient-to-r lg:from-primary/[0.07] lg:to-[#f8f9fb]">
      {/* Mobile: compact photo strip */}
      <LoginSlidePanel slides={slides} className="h-52 shrink-0 sm:h-60 lg:hidden" />

      {/* Desktop: inset image panel that blends into the form side */}
      <div className="relative hidden min-h-screen lg:flex lg:w-[54%] lg:items-stretch lg:py-6 lg:pl-8 lg:pr-0 xl:pl-10">
        <LoginSlidePanel
          slides={slides}
          className="min-h-full w-full rounded-2xl shadow-lg shadow-black/10"
        />
      </div>

      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-primary/10 to-transparent px-6 py-10 lg:bg-none lg:px-12 xl:px-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
