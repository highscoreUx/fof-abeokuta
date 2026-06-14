import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { fetchGalleryPhotoMediaFromGoogle, type GalleryMediaSize } from "@/lib/gallery-urls";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "gallery.view");
  if (ctx instanceof NextResponse) return ctx;

  const sizeParam = new URL(request.url).searchParams.get("size");
  const size: GalleryMediaSize = sizeParam === "full" ? "full" : "thumb";

  const photo = await prisma.galleryPhoto.findFirst({
    where: { id, eventId: ctx.event.id },
  });

  if (!photo || photo.status !== "READY" || !photo.googleMediaItemId) {
    return jsonError("Media not available", "NOT_FOUND", 404);
  }

  try {
    const { body, contentType } = await fetchGalleryPhotoMediaFromGoogle(photo, size);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media fetch failed";
    return jsonError(message, "MEDIA_FETCH_FAILED", 502);
  }
}
