"use client";

import { Select } from "@/components/ui/select";
import {
  GALLERY_FILTER_OPTIONS,
  encodeGalleryFilterValue,
  parseGalleryFilterValue,
} from "@/lib/gallery-filters";
import type { GalleryFilter } from "@/types/gallery";

interface GalleryFilterSelectProps {
  filter: GalleryFilter;
  team?: string;
  onFilterChange: (filter: GalleryFilter, team?: string) => void;
  className?: string;
}

export function GalleryFilterSelect({
  filter,
  team,
  onFilterChange,
  className,
}: GalleryFilterSelectProps) {
  return (
    <Select
      value={encodeGalleryFilterValue(filter, team)}
      onChange={(event) => {
        const parsed = parseGalleryFilterValue(event.target.value);
        onFilterChange(parsed.filter, parsed.team);
      }}
      className={className ?? "w-[9rem] shrink-0"}
      aria-label="Gallery filter"
    >
      {GALLERY_FILTER_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
