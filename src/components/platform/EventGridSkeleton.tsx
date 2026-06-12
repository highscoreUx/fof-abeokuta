"use client";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <SkeletonBar className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2 px-4 py-3">
        <SkeletonBar className="h-3 w-32" />
        <div className="flex justify-between gap-2">
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}
