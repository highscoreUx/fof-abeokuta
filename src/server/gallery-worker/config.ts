export const GALLERY_QUEUE_NAME = "fof.gallery";

/** Process multiple gallery uploads concurrently. */
export const GALLERY_PREFETCH = 5;

export const GALLERY_MAX_BYTES = 10 * 1024 * 1024;

export const GALLERY_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isGalleryQueueConfigured(): boolean {
  return Boolean(process.env.CLOUDAMQP_URL?.trim());
}

export function getGalleryStagingDir(): string {
  return process.env.GALLERY_STAGING_DIR?.trim() || ".gallery-staging";
}
