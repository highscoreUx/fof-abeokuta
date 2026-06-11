import { cn } from "@/lib/cn";

export function AgendaEmpty({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {message}
    </div>
  );
}
