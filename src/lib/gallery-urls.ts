import { ensureGoogleAlbumForLibrary } from "@/lib/gallery-library";
import { prisma } from "@/lib/prisma";
import {
  fetchGooglePhotosMediaBytes,
  getGooglePhotosMediaItem,
  googleMediaDisplayUrls,
  googlePhotoUrlExpiresAt,
  isGooglePhotoUrlExpired,
} from "@/server/google-photos";

export type GalleryMediaSize = "thumb" | "full";

function isMalformedGoogleMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (url.match(/=/g)?.length ?? 0) > 1;
}

export async function ensureGalleryPhotoGoogleUrls(photo: {
  id: string;
  googleMediaItemId: string | null;
  mimeType: string;
  url: string | null;
  thumbnailUrl: string | null;
  urlExpiresAt: Date | null;
}) {
  if (!photo.googleMediaItemId) return null;

  const needsRefresh =
    isGooglePhotoUrlExpired(photo.urlExpiresAt) ||
    !photo.url ||
    !photo.thumbnailUrl ||
    isMalformedGoogleMediaUrl(photo.url) ||
    isMalformedGoogleMediaUrl(photo.thumbnailUrl);

  if (!needsRefresh) {
    return photo;
  }

  const item = await getGooglePhotosMediaItem(photo.googleMediaItemId);
  const urls = googleMediaDisplayUrls(item.baseUrl, item.mimeType || photo.mimeType);
  const urlExpiresAt = googlePhotoUrlExpiresAt();

  await prisma.galleryPhoto.update({
    where: { id: photo.id },
    data: {
      url: urls.url,
      thumbnailUrl: urls.thumbnailUrl,
      urlExpiresAt,
    },
  });

  photo.url = urls.url;
  photo.thumbnailUrl = urls.thumbnailUrl;
  photo.urlExpiresAt = urlExpiresAt;
  return photo;
}

export function galleryPhotoGoogleFetchUrl(
  photo: { url: string | null; thumbnailUrl: string | null; mimeType: string },
  size: GalleryMediaSize,
): string | null {
  if (size === "full") return photo.url;
  return photo.thumbnailUrl ?? photo.url;
}

export async function fetchGalleryPhotoMediaFromGoogle(
  photo: {
    id: string;
    googleMediaItemId: string | null;
    mimeType: string;
    url: string | null;
    thumbnailUrl: string | null;
    urlExpiresAt: Date | null;
  },
  size: GalleryMediaSize,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const refreshed = await ensureGalleryPhotoGoogleUrls(photo);
  if (!refreshed) {
    throw new Error("Media not available");
  }

  const googleUrl = galleryPhotoGoogleFetchUrl(refreshed, size);
  if (!googleUrl) {
    throw new Error("Media URL missing");
  }

  let response = await fetchGooglePhotosMediaBytes(googleUrl);
  if (!response.ok) {
    refreshed.urlExpiresAt = null;
    await ensureGalleryPhotoGoogleUrls(refreshed);
    const retryUrl = galleryPhotoGoogleFetchUrl(refreshed, size);
    if (!retryUrl) throw new Error("Media URL missing");
    response = await fetchGooglePhotosMediaBytes(retryUrl);
  }

  if (!response.ok) {
    throw new Error(`Google Photos media fetch failed (${response.status})`);
  }

  const body = await response.arrayBuffer();
  if (body.byteLength === 0) {
    throw new Error("Google Photos returned empty media");
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    (size === "full" && refreshed.mimeType.startsWith("video/")
      ? refreshed.mimeType
      : "image/jpeg");

  if (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("html")
  ) {
    throw new Error(`Google Photos returned unexpected content type (${contentType})`);
  }

  return { body, contentType };
}

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
    if (
      !isGooglePhotoUrlExpired(photo.urlExpiresAt) &&
      photo.url &&
      !isMalformedGoogleMediaUrl(photo.url) &&
      !isMalformedGoogleMediaUrl(photo.thumbnailUrl)
    ) {
      continue;
    }

    updates.push(
      (async () => {
        try {
          await ensureGalleryPhotoGoogleUrls(photo);
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
