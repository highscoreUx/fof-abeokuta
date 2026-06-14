"use client";

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

function GalleryTileSkeleton() {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card">
      <SkeletonBar className="aspect-square w-full rounded-none" />
      <figcaption className="space-y-2 p-3">
        <SkeletonBar className="h-3 w-14" />
        <SkeletonBar className="h-3 w-20" />
      </figcaption>
    </figure>
  );
}

interface GalleryGridSkeletonProps {
  tiles?: number;
}

export function GalleryGridSkeleton({ tiles = 8 }: GalleryGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: tiles }).map((_, index) => (
        <GalleryTileSkeleton key={index} />
      ))}
    </div>
  );
}
