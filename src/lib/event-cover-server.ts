import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { EVENT_COVER_MAX_BYTES, EVENT_COVER_TYPES } from "@/lib/event-cover";

export async function saveEventCoverFile(slug: string, file: File): Promise<string> {
  if (!EVENT_COVER_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }
  if (file.size > EVENT_COVER_MAX_BYTES) {
    throw new Error("Image must be 5MB or smaller");
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uploadDir = path.join(process.cwd(), "public", "uploads", "events", slug);
  await mkdir(uploadDir, { recursive: true });

  const filename = `cover.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return `/uploads/events/${slug}/${filename}`;
}
