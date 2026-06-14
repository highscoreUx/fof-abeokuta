import type { GalleryFileDimensions } from "@/lib/gallery-file-meta";

function readImageDimensions(file: File): Promise<GalleryFileDimensions | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
        return;
      }
      resolve(null);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    image.src = url;
  });
}

function readVideoDimensions(file: File): Promise<GalleryFileDimensions | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        return;
      }
      resolve(null);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    video.src = url;
  });
}

export async function readGalleryFileDimensions(
  file: File,
): Promise<GalleryFileDimensions | null> {
  if (file.type.startsWith("image/")) {
    return readImageDimensions(file);
  }
  if (file.type.startsWith("video/")) {
    return readVideoDimensions(file);
  }
  return null;
}
