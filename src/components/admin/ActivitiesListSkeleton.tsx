"use client";

import { Card } from "@/components/ui/card";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

function ActivityCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBar className="h-5 w-24" />
            <SkeletonBar className="h-5 w-16" />
          </div>
          <SkeletonBar className="h-5 w-48 max-w-full" />
          <SkeletonBar className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonBar className="h-10 w-24" />
          <SkeletonBar className="h-10 w-28" />
        </div>
      </div>
    </Card>
  );
}

export function ActivitiesListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonBar className="h-4 w-32" />
        <SkeletonBar className="h-10 w-28" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <ActivityCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
