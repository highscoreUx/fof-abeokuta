"use client";

const SKELETON_HEIGHTS = ["h-44", "h-56", "h-48", "h-64", "h-40", "h-52", "h-60", "h-36"] as const;

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

function GalleryTileSkeleton({ heightClass }: { heightClass: string }) {
  return (
    <figure className="mb-3 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card">
      <SkeletonBar className={`${heightClass} w-full rounded-none`} />
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

export function GalleryGridSkeleton({ tiles = 10 }: GalleryGridSkeletonProps) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
      {Array.from({ length: tiles }).map((_, index) => (
        <GalleryTileSkeleton
          key={index}
          heightClass={SKELETON_HEIGHTS[index % SKELETON_HEIGHTS.length]}
        />
      ))}
    </div>
  );
}
