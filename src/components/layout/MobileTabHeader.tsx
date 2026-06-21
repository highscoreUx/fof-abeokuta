"use client";

import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/cn";

interface MobileTabHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Show compact logo beside the title (mobile home tabs). Hidden on lg by default. */
  showLogo?: boolean;
  className?: string;
}

export function MobileTabHeader({
  title,
  subtitle,
  actions,
  showLogo = true,
  className,
}: MobileTabHeaderProps) {
  return (
    <header
      className={cn(
        "shrink-0 border-b border-border/60 bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {showLogo && (
            <BrandMark compact className="shrink-0 max-lg:flex lg:hidden" />
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground lg:text-base lg:font-semibold">
              {title}
            </h1>
            {subtitle}
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}
