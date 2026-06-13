import { FofLogo } from "@/components/brand/FofLogo";
import { cn } from "@/lib/cn";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <FofLogo size={compact ? 36 : 40} variant="mark" />
      <div className="min-w-0">
        {!compact && (
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            Friends of Figma
          </p>
        )}
        <p className="text-xs text-muted-foreground">Abeokuta</p>
      </div>
    </div>
  );
}
