import { prisma } from "@/lib/prisma";
import {
  createGooglePhotosAlbum,
  getGooglePhotosAlbum,
  isGooglePhotosConfigured,
} from "@/server/google-photos";

function albumTitleForEvent(title: string, slug: string): string {
  const trimmed = title.trim() || slug;
  return `FOF · ${trimmed}`.slice(0, 120);
}

function albumUrlFromGoogle(album: { productUrl?: string }) {
  return album.productUrl?.trim() || null;
}

/** Backfill productUrl for libraries created before we stored it automatically. */
export async function syncOfficialGalleryUrlFromGoogle(library: {
  id: string;
  googleAlbumId: string | null;
  officialGalleryUrl: string | null;
}) {
  if (!library.googleAlbumId || library.officialGalleryUrl || !isGooglePhotosConfigured()) {
    return prisma.eventPhotoLibrary.findUniqueOrThrow({ where: { id: library.id } });
  }

  try {
    const album = await getGooglePhotosAlbum(library.googleAlbumId);
    const productUrl = albumUrlFromGoogle(album);
    if (!productUrl) {
      return prisma.eventPhotoLibrary.findUniqueOrThrow({ where: { id: library.id } });
    }

    return prisma.eventPhotoLibrary.update({
      where: { id: library.id },
      data: { officialGalleryUrl: productUrl },
    });
  } catch (error) {
    console.warn(
      `[gallery] Failed to fetch Google Photos album URL for ${library.googleAlbumId}:`,
      error,
    );
    return prisma.eventPhotoLibrary.findUniqueOrThrow({ where: { id: library.id } });
  }
}

export async function provisionEventPhotoLibrary(eventId: string, eventTitle: string, slug: string) {
  const existing = await prisma.eventPhotoLibrary.findUnique({ where: { eventId } });
  if (existing?.googleAlbumId) {
    return syncOfficialGalleryUrlFromGoogle(existing);
  }

  let googleAlbumId: string | null = null;
  let officialGalleryUrl: string | null = null;

  if (isGooglePhotosConfigured()) {
    try {
      const album = await createGooglePhotosAlbum(albumTitleForEvent(eventTitle, slug));
      googleAlbumId = album.id;
      officialGalleryUrl = albumUrlFromGoogle(album);
      console.info(`[gallery] Google Photos album created for event ${slug}: ${album.id}`);
    } catch (error) {
      console.error(`[gallery] Failed to create Google Photos album for ${slug}:`, error);
    }
  } else {
    console.warn("[gallery] Google Photos not configured — event library created without googleAlbumId");
  }

  if (existing) {
    return prisma.eventPhotoLibrary.update({
      where: { id: existing.id },
      data: {
        googleAlbumId: googleAlbumId ?? undefined,
        officialGalleryUrl: officialGalleryUrl ?? undefined,
      },
    });
  }

  return prisma.eventPhotoLibrary.create({
    data: {
      eventId,
      googleAlbumId,
      officialGalleryUrl,
    },
  });
}

export async function ensureGoogleAlbumForLibrary(library: {
  id: string;
  eventId: string;
  googleAlbumId: string | null;
  officialGalleryUrl?: string | null;
  event?: { title: string; slug: string };
}) {
  if (library.googleAlbumId || !isGooglePhotosConfigured()) {
    return syncOfficialGalleryUrlFromGoogle({
      id: library.id,
      googleAlbumId: library.googleAlbumId,
      officialGalleryUrl: library.officialGalleryUrl ?? null,
    });
  }

  const event =
    library.event ??
    (await prisma.event.findUnique({
      where: { id: library.eventId },
      select: { title: true, slug: true },
    }));
  if (!event) {
    return prisma.eventPhotoLibrary.findUniqueOrThrow({ where: { id: library.id } });
  }

  const album = await createGooglePhotosAlbum(albumTitleForEvent(event.title, event.slug));
  return prisma.eventPhotoLibrary.update({
    where: { id: library.id },
    data: {
      googleAlbumId: album.id,
      officialGalleryUrl: albumUrlFromGoogle(album),
    },
  });
}
