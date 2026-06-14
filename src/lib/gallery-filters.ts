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
