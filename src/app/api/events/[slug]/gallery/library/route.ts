import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { ensureEventPhotoLibrary } from "@/lib/gallery";
import { serializePhotoLibrary } from "@/lib/gallery-urls";

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
