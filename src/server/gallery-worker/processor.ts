import { prisma } from "@/lib/prisma";
import { ensureGoogleAlbumForLibrary } from "@/lib/gallery-library";
import {
  deleteGalleryStagingFile,
  readGalleryStagingFile,
} from "@/server/gallery-worker/staging";
import { galleryDefaultExtension } from "@/lib/gallery-media";
import {
  googleMediaDisplayUrls,
  googlePhotoUrlExpiresAt,
  uploadGooglePhotosMediaToAlbum,
} from "@/server/google-photos";

export async function processGalleryUpload(photoId: string): Promise<void> {
  const photo = await prisma.galleryPhoto.findUnique({
    where: { id: photoId },
    include: { library: true },
  });
  if (!photo) {
    await deleteGalleryStagingFile(photoId);
    return;
  }

  if (photo.status === "READY") {
    await deleteGalleryStagingFile(photoId);
    return;
  }

  await prisma.galleryPhoto.update({
    where: { id: photoId },
    data: { status: "PROCESSING", errorMessage: null },
  });

  const buffer = await readGalleryStagingFile(photoId);
  if (!buffer) {
    await prisma.galleryPhoto.update({
      where: { id: photoId },
      data: {
        status: "FAILED",
        errorMessage: "Staging file missing",
      },
    });
    return;
  }

  try {
    const library = await ensureGoogleAlbumForLibrary(photo.library);
    if (!library.googleAlbumId) {
      throw new Error("Google Photos album not configured for this event");
    }

    const fileName =
      photo.originalFilename || `${photoId}.${galleryDefaultExtension(photo.mimeType)}`;
    const descriptionParts = [
      photo.isOfficial ? "Official" : null,
      photo.uploadedByTeamName ? `Team ${photo.uploadedByTeamName}` : null,
      photo.caption,
    ].filter(Boolean);

    const mediaItem = await uploadGooglePhotosMediaToAlbum({
      albumId: library.googleAlbumId,
      buffer,
      mimeType: photo.mimeType,
      fileName,
      description: descriptionParts.join(" · ") || undefined,
    });

    const urls = googleMediaDisplayUrls(mediaItem.baseUrl, mediaItem.mimeType || photo.mimeType);

    await prisma.galleryPhoto.update({
      where: { id: photoId },
      data: {
        status: "READY",
        googleMediaItemId: mediaItem.id,
        url: urls.url,
        thumbnailUrl: urls.thumbnailUrl,
        urlExpiresAt: googlePhotoUrlExpiresAt(),
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    await deleteGalleryStagingFile(photoId);
    console.info(`[gallery] Uploaded ${photoId} to Google Photos (${mediaItem.id})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    await prisma.galleryPhoto.update({
      where: { id: photoId },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });
    await deleteGalleryStagingFile(photoId);
    throw error;
  }
}
