"use client";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

function AgendaItemSkeleton() {
  return (
    <article className="flex min-h-[108px] overflow-hidden rounded-md border border-border/60">
      <SkeletonBar className="w-1.5 shrink-0 rounded-none" />
      <SkeletonBar className="w-12 shrink-0 rounded-none" />
      <SkeletonBar className="w-20 shrink-0 rounded-none" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBar className="h-5 w-48 max-w-full" />
          <SkeletonBar className="h-3 w-32 max-w-full" />
          <SkeletonBar className="h-4 w-full max-w-md" />
        </div>
        <SkeletonBar className="hidden h-8 w-20 shrink-0 sm:block" />
      </div>
      <SkeletonBar className="w-4 shrink-0 rounded-none sm:w-5" />
    </article>
  );
}

interface AgendaListSkeletonProps {
  rows?: number;
  /** Show admin toolbar placeholders (schedule count, template, actions). */
  showHeader?: boolean;
}

export function AgendaListSkeleton({ rows = 4, showHeader = false }: AgendaListSkeletonProps) {
  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBar className="h-4 w-44" />
            <SkeletonBar className="h-3 w-28" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SkeletonBar className="h-10 w-32" />
            <SkeletonBar className="h-10 w-36" />
          </div>
        </div>
      )}

      <div className="space-y-5">
        {Array.from({ length: rows }).map((_, index) => (
          <AgendaItemSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
