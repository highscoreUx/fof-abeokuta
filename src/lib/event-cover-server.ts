import { EVENT_COVER_MAX_BYTES, EVENT_COVER_TYPES } from "@/lib/event-cover";
import { getStorageAdapter } from "@/lib/storage";

function coverExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadEventBrandingImage(
  slug: string,
  file: File,
  filename: string,
): Promise<string> {
  if (!EVENT_COVER_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }
  if (file.size > EVENT_COVER_MAX_BYTES) {
    throw new Error("Image must be 5MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
  const asset = await storage.upload(buffer, {
    folder: `events/${slug}`,
    filename,
    mimeType: file.type,
    resourceType: "image",
  });

  return asset.url;
}

export async function saveEventCoverFile(slug: string, file: File): Promise<string> {
  return uploadEventBrandingImage(slug, file, `cover.${coverExtension(file.type)}`);
}
