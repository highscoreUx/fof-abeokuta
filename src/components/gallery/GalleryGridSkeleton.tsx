"use client";

import { GalleryGrid, galleryGridTileClassName } from "@/components/gallery/GalleryGrid";
import { GalleryShimmer } from "@/components/gallery/GalleryShimmer";
import { cn } from "@/lib/cn";

interface GalleryGridSkeletonProps {
  tiles?: number;
  native?: boolean;
}

export function GalleryGridSkeleton({ tiles = 12, native = false }: GalleryGridSkeletonProps) {
  const tileCount = native ? 15 : tiles;

  return (
    <GalleryGrid native={native}>
      {Array.from({ length: tileCount }).map((_, index) => (
        <figure key={index} className={galleryGridTileClassName(undefined, native)}>
          <GalleryShimmer
            className={cn("h-full w-full", !native && "rounded-2xl")}
            label="Loading gallery"
          />
        </figure>
      ))}
    </GalleryGrid>
  );
}
