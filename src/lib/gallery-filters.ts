import type { GalleryFilter } from "@/types/gallery";

const TEAM_LETTERS = ["F", "I", "G", "M", "A"] as const;

export const GALLERY_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "official", label: "Official" },
  ...TEAM_LETTERS.map((letter) => ({ value: `team:${letter}`, label: letter })),
  { value: "mine", label: "Mine" },
];

export function encodeGalleryFilterValue(filter: GalleryFilter, team?: string): string {
  if (filter === "team" && team) return `team:${team}`;
  return filter;
}

export function parseGalleryFilterValue(value: string): {
  filter: GalleryFilter;
  team?: string;
} {
  if (value.startsWith("team:")) {
    return { filter: "team", team: value.slice(5) };
  }
  return { filter: value as GalleryFilter };
}

export function galleryEmptyMessage(
  filter: GalleryFilter,
  options?: { team?: string; officialGalleryUrl?: string | null },
): string {
  if (filter === "official") {
    return options?.officialGalleryUrl
      ? "No official media in the app gallery yet."
      : "No official media uploaded in-app yet.";
  }
  if (filter === "mine") {
    return "You haven't uploaded any media yet.";
  }
  if (filter === "team" && options?.team) {
    return `No media from Team ${options.team} yet.`;
  }
  return "No media yet. Upload photos and videos to get started.";
}
