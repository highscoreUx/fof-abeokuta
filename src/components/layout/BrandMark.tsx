import { cn } from "@/lib/cn";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold tracking-tight text-primary-foreground shadow-sm">
        FOF
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-secondary" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">Friends of Figma</p>
          <p className="text-xs text-muted-foreground">Abeokuta</p>
        </div>
      )}
    </div>
  );
}
