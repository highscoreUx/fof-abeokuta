export const GALLERY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const GALLERY_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

export const GALLERY_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const GALLERY_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";

export function galleryMaxBytesForMime(mimeType: string): number {
  return mimeType.startsWith("video/") ? GALLERY_VIDEO_MAX_BYTES : GALLERY_IMAGE_MAX_BYTES;
}

export function isGalleryVideoMime(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function galleryDefaultExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    default:
      return mimeType.startsWith("video/") ? "mp4" : "jpg";
  }
}
