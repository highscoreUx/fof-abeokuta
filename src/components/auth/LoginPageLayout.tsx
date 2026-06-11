"use client";

import { LoginSlidePanel } from "@/components/auth/LoginSlidePanel";

interface LoginPageLayoutProps {
  slides: string[];
  children: React.ReactNode;
}

export function LoginPageLayout({ slides, children }: LoginPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <LoginSlidePanel slides={slides} className="h-56 shrink-0 lg:hidden" />
      <LoginSlidePanel
        slides={slides}
        className="hidden min-h-screen lg:block lg:w-[52%] xl:w-1/2"
      />
      <div className="flex flex-1 items-center justify-center border-border bg-[#f8f9fb] px-6 py-10 lg:border-l lg:px-12 xl:px-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
