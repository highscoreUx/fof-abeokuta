import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { hasAnyPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteGalleryStagingFile } from "@/server/gallery-worker/staging";
import { removeGooglePhotosMediaFromAlbum } from "@/server/google-photos";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "gallery.view");
  if (ctx instanceof NextResponse) return ctx;

  const photo = await prisma.galleryPhoto.findFirst({
    where: { id, eventId: ctx.event.id },
    include: { library: true },
  });
  if (!photo) {
    return jsonError("Photo not found", "NOT_FOUND", 404);
  }

  const canManage = hasAnyPermission(ctx.auth.permissions, ["gallery.manage"]);
  const isOwner = photo.uploadedByUserId === ctx.auth.userId;

  if (!canManage && !isOwner) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  if (photo.googleMediaItemId && photo.library.googleAlbumId) {
    try {
      await removeGooglePhotosMediaFromAlbum({
        albumId: photo.library.googleAlbumId,
        mediaItemId: photo.googleMediaItemId,
      });
    } catch {
      // best-effort — DB row is still removed
    }
  }

  await prisma.galleryPhoto.delete({ where: { id: photo.id } });
  await deleteGalleryStagingFile(photo.id);

  return NextResponse.json({ ok: true });
}
