export interface GalleryFileDimensions {
  width: number;
  height: number;
}

export function parseGalleryFileMetaJson(
  raw: unknown,
): Array<GalleryFileDimensions | null> {
  if (!Array.isArray(raw)) return [];

  return raw.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const width = Number((entry as { width?: unknown }).width);
    const height = Number((entry as { height?: unknown }).height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (width <= 0 || height <= 0 || width > 32_000 || height > 32_000) return null;
    return { width: Math.round(width), height: Math.round(height) };
  });
}
