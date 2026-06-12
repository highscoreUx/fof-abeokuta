export const EVENT_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const DEFAULT_COVERS = ["/images/fof1.jpg", "/images/fof2.jpg", "/images/fof3.jpg"];

export function getEventCoverUrl(
  coverImageUrl: string | null | undefined,
  fallbackIndex = 0,
): string {
  if (coverImageUrl) return coverImageUrl;
  return DEFAULT_COVERS[fallbackIndex % DEFAULT_COVERS.length]!;
}
