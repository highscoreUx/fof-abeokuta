import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { getStorageAdapter } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const quizCtx = await requireEventPermission(request, slug, "quiz.manage");
  const ctx =
    quizCtx instanceof NextResponse
      ? await requireEventPermission(request, slug, "survey.manage")
      : quizCtx;
  if (ctx instanceof NextResponse) return ctx;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? `events/${ctx.event.id}`;

  if (!file) return jsonError("No file provided", "NO_FILE", 400);
  if (file.size > MAX_BYTES) return jsonError("File too large (max 10MB)", "FILE_TOO_LARGE", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const resourceType = mimeType.startsWith("audio/")
    ? "video"
    : mimeType.startsWith("image/")
      ? "image"
      : "raw";

  try {
    const storage = getStorageAdapter();
    const asset = await storage.upload(buffer, {
      folder,
      filename: file.name.replace(/[^a-zA-Z0-9._-]/g, "-"),
      mimeType,
      resourceType,
    });
    return NextResponse.json({ asset });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Upload failed",
      "UPLOAD_FAILED",
      500,
    );
  }
}
