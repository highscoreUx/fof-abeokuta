"use client";

import { GalleryGrid, galleryGridTileClassName } from "@/components/gallery/GalleryGrid";
import { GalleryShimmer } from "@/components/gallery/GalleryShimmer";

interface GalleryGridSkeletonProps {
  tiles?: number;
}

export function GalleryGridSkeleton({ tiles = 12 }: GalleryGridSkeletonProps) {
  return (
    <GalleryGrid>
      {Array.from({ length: tiles }).map((_, index) => (
        <figure key={index} className={galleryGridTileClassName("aspect-square")}>
          <GalleryShimmer className="h-full w-full rounded-2xl" label="Loading gallery" />
        </figure>
      ))}
    </GalleryGrid>
  );
}
