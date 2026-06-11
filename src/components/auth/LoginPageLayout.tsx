"use client";

import { LoginSlidePanel } from "@/components/auth/LoginSlidePanel";
interface LoginPageLayoutProps {
  slides: string[];
  children: React.ReactNode;
}

export function LoginPageLayout({ slides, children }: LoginPageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <LoginSlidePanel slides={slides} className="hidden min-h-screen lg:block lg:w-1/2 xl:w-[55%]" />
      <div className="flex min-h-screen flex-1 items-center justify-center p-6">{children}</div>
    </div>
  );
}
