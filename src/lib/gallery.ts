import { ensureGoogleAlbumForLibrary } from "@/lib/gallery-library";
import { prisma } from "@/lib/prisma";
import type { GalleryPhotoStatus } from "@/generated/prisma/client";

export type GalleryFilter = "all" | "official" | "mine" | "team";

export interface GalleryListQuery {
  filter?: GalleryFilter;
  teamId?: string;
  page?: number;
  limit?: number;
  /** When true, include pending/processing rows for the current uploader. */
  includePendingForUserId?: string;
}

export async function ensureEventPhotoLibrary(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true },
  });
  if (!event) throw new Error("Event not found");

  let library = await prisma.eventPhotoLibrary.findUnique({ where: { eventId } });
  if (!library) {
    const { provisionEventPhotoLibrary } = await import("@/lib/gallery-library");
    library = await provisionEventPhotoLibrary(event.id, event.title, event.slug);
  }

  return ensureGoogleAlbumForLibrary({ ...library, event });
}

export async function resolveTeamIdByLetter(eventId: string, letter: string) {
  const team = await prisma.team.findUnique({
    where: { eventId_letter: { eventId, letter: letter.toUpperCase() } },
    select: { id: true, letter: true, name: true },
  });
  return team;
}

export function buildGalleryWhere(
  eventId: string,
  query: GalleryListQuery,
  currentUserId?: string,
) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(60, Math.max(1, query.limit ?? 24));
  const filter = query.filter ?? "all";

  const readyFilter = {
    eventId,
    OR: [
      { status: "READY" as GalleryPhotoStatus },
      ...(query.includePendingForUserId
        ? [
            {
              uploadedByUserId: query.includePendingForUserId,
              status: { in: ["PENDING", "PROCESSING", "FAILED"] as GalleryPhotoStatus[] },
            },
          ]
        : []),
    ],
  };

  if (filter === "official") {
    return {
      where: { ...readyFilter, isOfficial: true },
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  if (filter === "mine" && currentUserId) {
    return {
      where: { ...readyFilter, uploadedByUserId: currentUserId },
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  if (filter === "team" && query.teamId) {
    return {
      where: {
        ...readyFilter,
        uploadedByTeamId: query.teamId,
      },
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  return {
    where: readyFilter,
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function serializeGalleryPhoto(photo: {
  id: string;
  eventId: string;
  uploadedByUserId: string | null;
  uploadedByTeamId: string | null;
  uploadedByTeamName: string | null;
  isOfficial: boolean;
  status: GalleryPhotoStatus;
  mimeType: string;
  url: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  originalFilename: string | null;
  errorMessage: string | null;
  uploadedAt: Date;
  processedAt: Date | null;
  uploadedBy?: {
    account: {
      username: string;
      firstName: string;
      lastName: string;
    };
  } | null;
  uploadedByTeam?: {
    letter: string;
    name: string;
  } | null;
}) {
  return {
    id: photo.id,
    eventId: photo.eventId,
    uploadedByUserId: photo.uploadedByUserId,
    uploadedByTeamId: photo.uploadedByTeamId,
    uploadedByTeamLetter: photo.uploadedByTeam?.letter ?? null,
    uploadedByTeamName: photo.uploadedByTeamName ?? photo.uploadedByTeam?.name ?? null,
    isOfficial: photo.isOfficial,
    status: photo.status,
    mimeType: photo.mimeType,
    url: null,
    thumbnailUrl: null,
    caption: photo.caption,
    originalFilename: photo.originalFilename,
    errorMessage: photo.errorMessage,
    uploadedAt: photo.uploadedAt.toISOString(),
    processedAt: photo.processedAt?.toISOString() ?? null,
    uploaderName: photo.uploadedBy?.account
      ? `${photo.uploadedBy.account.firstName} ${photo.uploadedBy.account.lastName}`.trim()
      : null,
    uploaderUsername: photo.uploadedBy?.account.username ?? null,
  };
}

export const galleryPhotoInclude = {
  uploadedBy: {
    select: {
      account: {
        select: {
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  uploadedByTeam: {
    select: {
      letter: true,
      name: true,
    },
  },
} as const;
