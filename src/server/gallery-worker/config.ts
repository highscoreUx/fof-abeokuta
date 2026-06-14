import {
  GALLERY_ALLOWED_MIME_TYPES,
  GALLERY_FILE_ACCEPT,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_VIDEO_MAX_BYTES,
  galleryMaxBytesForMime,
} from "@/lib/gallery-media";

export const GALLERY_QUEUE_NAME = "fof.gallery";

/** Process multiple gallery uploads concurrently. */
export const GALLERY_PREFETCH = 5;

export {
  GALLERY_ALLOWED_MIME_TYPES,
  GALLERY_FILE_ACCEPT,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_VIDEO_MAX_BYTES,
  galleryMaxBytesForMime,
};

/** @deprecated use galleryMaxBytesForMime */
export const GALLERY_MAX_BYTES = GALLERY_VIDEO_MAX_BYTES;

export function isGalleryQueueConfigured(): boolean {
  return Boolean(process.env.CLOUDAMQP_URL?.trim());
}

export function getGalleryStagingDir(): string {
  return process.env.GALLERY_STAGING_DIR?.trim() || ".gallery-staging";
}
