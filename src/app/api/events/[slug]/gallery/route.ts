import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { hasAnyPermission } from "@/lib/permissions";
import {
  buildGalleryWhere,
  ensureEventPhotoLibrary,
  galleryPhotoInclude,
  resolveTeamIdByLetter,
  serializeGalleryPhoto,
} from "@/lib/gallery";
import { refreshGalleryPhotoUrls, serializePhotoLibrary } from "@/lib/gallery-urls";
import { toPaginatedResponse } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "gallery.view");
  if (ctx instanceof NextResponse) return ctx;

  const library = await ensureEventPhotoLibrary(ctx.event.id);
  const { searchParams } = new URL(request.url);
  const filter = (searchParams.get("filter") ?? "all") as
    | "all"
    | "official"
    | "mine"
    | "team";
  const teamLetter = searchParams.get("team") ?? undefined;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    60,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "24", 10) || 24),
  );

  let teamId: string | undefined;
  if (filter === "team" && teamLetter) {
    const team = await resolveTeamIdByLetter(ctx.event.id, teamLetter);
    if (!team) {
      return jsonError("Team not found", "NOT_FOUND", 404);
    }
    teamId = team.id;
  }

  const { where, skip } = buildGalleryWhere(ctx.event.id, {
    filter,
    teamId,
    page,
    limit,
    includePendingForUserId: ctx.auth.userId,
  });

  const [photos, total] = await Promise.all([
    prisma.galleryPhoto.findMany({
      where,
      include: galleryPhotoInclude,
      orderBy: { uploadedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.galleryPhoto.count({ where }),
  ]);

  await refreshGalleryPhotoUrls(photos);

  return NextResponse.json({
    library: serializePhotoLibrary(library),
    ...toPaginatedResponse(
      photos.map((photo) => serializeGalleryPhoto(photo)),
      total,
      page,
      limit,
    ),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "gallery.view");
  if (ctx instanceof NextResponse) return ctx;

  if (
    !hasAnyPermission(ctx.auth.permissions, ["gallery.upload", "gallery.media_upload"])
  ) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const formData = await request.formData();
  const isOfficialRequested = formData.get("isOfficial") === "true";
  const caption = (formData.get("caption") as string | null)?.trim() || null;

  const canUploadOfficial = hasAnyPermission(ctx.auth.permissions, [
    "gallery.media_upload",
    "gallery.manage",
  ]);
  const canUploadParticipant = hasAnyPermission(ctx.auth.permissions, ["gallery.upload"]);

  if (isOfficialRequested && !canUploadOfficial) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }
  if (!isOfficialRequested && !canUploadParticipant) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return jsonError("No files provided", "NO_FILES", 400);
  }
  if (files.length > 10) {
    return jsonError("Maximum 10 files per request", "TOO_MANY_FILES", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.auth.userId },
    include: { team: true },
  });
  if (!user) {
    return jsonError("User not found", "NOT_FOUND", 404);
  }

  const isOfficial = isOfficialRequested && canUploadOfficial;

  const library = await ensureEventPhotoLibrary(ctx.event.id);
  const { saveGalleryStagingFile } = await import("@/server/gallery-worker/staging");
  const { enqueueGalleryUploadFireAndForget } = await import("@/server/gallery-worker");
  const { GALLERY_ALLOWED_MIME_TYPES, galleryMaxBytesForMime } = await import("@/lib/gallery-media");

  const createdIds: string[] = [];

  for (const file of files) {
    if (!GALLERY_ALLOWED_MIME_TYPES.has(file.type)) {
      return jsonError(`Unsupported file type: ${file.type || "unknown"}`, "INVALID_TYPE", 400);
    }
    const maxBytes = galleryMaxBytesForMime(file.type);
    if (file.size > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      return jsonError(`File too large (max ${limitMb}MB)`, "FILE_TOO_LARGE", 400);
    }

    const photo = await prisma.galleryPhoto.create({
      data: {
        libraryId: library.id,
        eventId: ctx.event.id,
        uploadedByUserId: user.id,
        uploadedByTeamId: isOfficial ? null : user.teamId,
        uploadedByTeamName: isOfficial ? null : user.team?.name ?? null,
        isOfficial,
        mimeType: file.type,
        originalFilename: file.name.replace(/[^a-zA-Z0-9._-]/g, "-"),
        caption,
      },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveGalleryStagingFile(photo.id, buffer);
    enqueueGalleryUploadFireAndForget(photo.id);
    createdIds.push(photo.id);
  }

  const photos = await prisma.galleryPhoto.findMany({
    where: { id: { in: createdIds } },
    include: galleryPhotoInclude,
  });

  return NextResponse.json(
    { photos: photos.map((photo) => serializeGalleryPhoto(photo)) },
    { status: 202 },
  );
}
