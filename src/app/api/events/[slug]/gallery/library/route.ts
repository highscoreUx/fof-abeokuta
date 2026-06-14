import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { ensureEventPhotoLibrary } from "@/lib/gallery";
import { serializePhotoLibrary } from "@/lib/gallery-urls";
import { prisma } from "@/lib/prisma";

const patchLibrarySchema = z.object({
  officialGalleryUrl: z.string().url().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "gallery.view");
  if (ctx instanceof NextResponse) return ctx;

  const library = await ensureEventPhotoLibrary(ctx.event.id);
  return NextResponse.json({
    library: serializePhotoLibrary(library),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "gallery.manage");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = patchLibrarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const library = await ensureEventPhotoLibrary(ctx.event.id);
  const updated = await prisma.eventPhotoLibrary.update({
    where: { id: library.id },
    data: {
      ...(parsed.data.officialGalleryUrl !== undefined
        ? { officialGalleryUrl: parsed.data.officialGalleryUrl }
        : {}),
    },
  });

  return NextResponse.json({
    library: serializePhotoLibrary(updated),
  });
}
