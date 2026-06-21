"use client";

import { GalleryUploadControls } from "@/components/gallery/GalleryUploadControls";
import { GALLERY_FILTER_OPTIONS, parseGalleryFilterValue } from "@/lib/gallery-filters";
import { cn } from "@/lib/cn";
import type { GalleryFilter } from "@/types/gallery";

export function GalleryMobileHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "shrink-0 border-b border-border/60 bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight text-foreground">Gallery</h1>
        <GalleryUploadControls variant="fab" />
      </div>
    </header>
  );
}

interface GalleryNativeFilterChipsProps {
  filter: GalleryFilter;
  team?: string;
  onFilterChange: (filter: GalleryFilter, team?: string) => void;
  className?: string;
}

export function GalleryNativeFilterChips({
  filter,
  team,
  onFilterChange,
  className,
}: GalleryNativeFilterChipsProps) {
  const activeValue = filter === "team" && team ? `team:${team}` : filter;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-border/40 bg-card px-4 py-2.5",
        className,
      )}
    >
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GALLERY_FILTER_OPTIONS.map((option) => {
          const active = activeValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                const parsed = parseGalleryFilterValue(option.value);
                onFilterChange(parsed.filter, parsed.team);
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
