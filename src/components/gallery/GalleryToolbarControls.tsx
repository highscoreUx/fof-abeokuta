"use client";

import { GalleryFilterSelect } from "@/components/gallery/GalleryFilterSelect";
import { GalleryUploadControls } from "@/components/gallery/GalleryUploadControls";
import type { GalleryFilter } from "@/types/gallery";

interface GalleryToolbarControlsProps {
  filter: GalleryFilter;
  team?: string;
  onFilterChange: (filter: GalleryFilter, team?: string) => void;
  className?: string;
}

export function GalleryToolbarControls({
  filter,
  team,
  onFilterChange,
  className,
}: GalleryToolbarControlsProps) {
  return (
    <div className={`flex shrink-0 items-center gap-2 ${className ?? ""}`}>
      <GalleryFilterSelect filter={filter} team={team} onFilterChange={onFilterChange} />
      <GalleryUploadControls />
    </div>
  );
}
