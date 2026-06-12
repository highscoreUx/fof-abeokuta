import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { jsonError } from "@/lib/auth/middleware";
import { invalidateEventCaches } from "@/lib/cache/invalidate";
import { saveEventCoverFile } from "@/lib/event-cover-server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("file is required", "VALIDATION_ERROR", 400);
  }

  try {
    const coverImageUrl = await saveEventCoverFile(event.slug, file);
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { coverImageUrl },
    });
    await invalidateEventCaches(updated.id, updated.slug);

    return NextResponse.json({
      event: {
        id: updated.id,
        slug: updated.slug,
        coverImageUrl: updated.coverImageUrl,
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Upload failed",
      "UPLOAD_FAILED",
      400,
    );
  }
}
