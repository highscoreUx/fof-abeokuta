import { prisma } from "@/lib/prisma";
import {
  createGooglePhotosAlbum,
  isGooglePhotosConfigured,
} from "@/server/google-photos";

function albumTitleForEvent(title: string, slug: string): string {
  const trimmed = title.trim() || slug;
  return `FOF · ${trimmed}`.slice(0, 120);
}

export async function provisionEventPhotoLibrary(eventId: string, eventTitle: string, slug: string) {
  const existing = await prisma.eventPhotoLibrary.findUnique({ where: { eventId } });
  if (existing?.googleAlbumId) return existing;

  let googleAlbumId: string | null = null;

  if (isGooglePhotosConfigured()) {
    try {
      const album = await createGooglePhotosAlbum(albumTitleForEvent(eventTitle, slug));
      googleAlbumId = album.id;
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
      data: { googleAlbumId: googleAlbumId ?? undefined },
    });
  }

  return prisma.eventPhotoLibrary.create({
    data: {
      eventId,
      googleAlbumId,
    },
  });
}

export async function ensureGoogleAlbumForLibrary(library: {
  id: string;
  eventId: string;
  googleAlbumId: string | null;
  event?: { title: string; slug: string };
}) {
  if (library.googleAlbumId || !isGooglePhotosConfigured()) {
    return prisma.eventPhotoLibrary.findUniqueOrThrow({ where: { id: library.id } });
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
    data: { googleAlbumId: album.id },
  });
}
