"use client";

import { CelebrationConfetti } from "@/components/ui/CelebrationConfetti";
import { cn } from "@/lib/cn";

interface ChatGameResultHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  celebrate?: boolean;
  className?: string;
}

export function ChatGameResultHero({
  eyebrow,
  title,
  subtitle,
  celebrate = false,
  className,
}: ChatGameResultHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center",
        className,
      )}
    >
      {celebrate && <CelebrationConfetti />}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
