export const PROCESS_GALLERY_UPLOAD_JOB = "process_gallery_upload" as const;

export interface ProcessGalleryUploadJob {
  type: typeof PROCESS_GALLERY_UPLOAD_JOB;
  photoId: string;
}

export function parseGalleryJob(raw: Buffer): ProcessGalleryUploadJob | null {
  try {
    const parsed = JSON.parse(raw.toString("utf8")) as Partial<ProcessGalleryUploadJob>;
    if (parsed.type !== PROCESS_GALLERY_UPLOAD_JOB || typeof parsed.photoId !== "string") {
      return null;
    }
    return { type: PROCESS_GALLERY_UPLOAD_JOB, photoId: parsed.photoId };
  } catch {
    return null;
  }
}
