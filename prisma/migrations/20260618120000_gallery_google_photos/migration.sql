-- Gallery storage: Google Photos album id + media item id (Cloudinary/R2 unchanged elsewhere).

ALTER TABLE "EventPhotoLibrary" ADD COLUMN IF NOT EXISTS "googleAlbumId" TEXT;

ALTER TABLE "GalleryPhoto" ADD COLUMN IF NOT EXISTS "googleMediaItemId" TEXT;
ALTER TABLE "GalleryPhoto" ADD COLUMN IF NOT EXISTS "urlExpiresAt" TIMESTAMP(3);

ALTER TABLE "GalleryPhoto" DROP COLUMN IF EXISTS "storageKey";
