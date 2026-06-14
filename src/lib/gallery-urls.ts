import { ensureGoogleAlbumForLibrary } from "@/lib/gallery-library";
import { prisma } from "@/lib/prisma";
import {
  getGooglePhotosMediaItem,
  googleMediaDisplayUrls,
  googlePhotoUrlExpiresAt,
  isGooglePhotoUrlExpired,
} from "@/server/google-photos";

export async function refreshGalleryPhotoUrls(photos: Array<{
  id: string;
  googleMediaItemId: string | null;
  mimeType: string;
  url: string | null;
  thumbnailUrl: string | null;
  urlExpiresAt: Date | null;
}>) {
  const updates: Array<Promise<unknown>> = [];

  for (const photo of photos) {
    if (!photo.googleMediaItemId) continue;
    if (!isGooglePhotoUrlExpired(photo.urlExpiresAt) && photo.url) continue;

    updates.push(
      (async () => {
        try {
          const item = await getGooglePhotosMediaItem(photo.googleMediaItemId!);
          const urls = googleMediaDisplayUrls(item.baseUrl, item.mimeType || photo.mimeType);
          await prisma.galleryPhoto.update({
            where: { id: photo.id },
            data: {
              url: urls.url,
              thumbnailUrl: urls.thumbnailUrl,
              urlExpiresAt: googlePhotoUrlExpiresAt(),
            },
          });
          photo.url = urls.url;
          photo.thumbnailUrl = urls.thumbnailUrl;
          photo.urlExpiresAt = googlePhotoUrlExpiresAt();
        } catch (error) {
          console.warn(`[gallery] Failed to refresh Google Photos URL for ${photo.id}:`, error);
        }
      })(),
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

export async function getGalleryLibraryForEvent(eventId: string) {
  const library = await prisma.eventPhotoLibrary.findUnique({ where: { eventId } });
  if (!library) return null;
  return ensureGoogleAlbumForLibrary(library);
}

export function serializePhotoLibrary(library: {
  id: string;
  eventId: string;
  googleAlbumId: string | null;
  officialGalleryUrl: string | null;
}) {
  return {
    id: library.id,
    eventId: library.eventId,
    googleAlbumId: library.googleAlbumId,
    officialGalleryUrl: library.officialGalleryUrl,
  };
}
