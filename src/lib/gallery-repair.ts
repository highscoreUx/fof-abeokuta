import { prisma } from "@/lib/prisma";
import {
  googleMediaDisplayUrls,
  googlePhotoUrlExpiresAt,
  searchAlbumMediaItemByFilename,
} from "@/server/google-photos";

export async function tryRepairGalleryPhotoFromGoogle(photo: {
  id: string;
  status: string;
  mimeType: string;
  originalFilename: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  urlExpiresAt?: Date | null;
  googleMediaItemId?: string | null;
  processedAt?: Date | null;
  errorMessage?: string | null;
  library: { googleAlbumId: string | null };
}): Promise<boolean> {
  if (photo.status !== "FAILED" || !photo.library.googleAlbumId || !photo.originalFilename) {
    return false;
  }

  const found = await searchAlbumMediaItemByFilename(
    photo.library.googleAlbumId,
    photo.originalFilename,
  );
  if (!found) return false;

  const urls = googleMediaDisplayUrls(found.baseUrl, found.mimeType || photo.mimeType);
  const urlExpiresAt = googlePhotoUrlExpiresAt();
  const processedAt = new Date();

  await prisma.galleryPhoto.update({
    where: { id: photo.id },
    data: {
      status: "READY",
      googleMediaItemId: found.id,
      url: urls.url,
      thumbnailUrl: urls.thumbnailUrl,
      urlExpiresAt,
      processedAt,
      errorMessage: null,
    },
  });

  photo.status = "READY";
  photo.googleMediaItemId = found.id;
  photo.url = urls.url;
  photo.thumbnailUrl = urls.thumbnailUrl;
  photo.urlExpiresAt = urlExpiresAt;
  photo.processedAt = processedAt;
  photo.errorMessage = null;
  return true;
}
