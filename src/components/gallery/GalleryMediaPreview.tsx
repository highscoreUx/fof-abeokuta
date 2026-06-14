"use client";

import { useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { galleryMediaApiPath, type GalleryMediaSize } from "@/lib/gallery-media-client";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryMediaPreviewProps {
  photo: GalleryPhotoRow;
  className?: string;
}

function useGalleryMediaSrc(photoId: string, size: GalleryMediaSize, enabled: boolean): string | null {
  const { path } = useEventApi();
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!enabled || !accessToken) return null;
  return path(galleryMediaApiPath(photoId, size, accessToken));
}

export function GalleryMediaPreview({ photo, className }: GalleryMediaPreviewProps) {
  const [loadError, setLoadError] = useState(false);

  const alt = photo.caption ?? photo.originalFilename ?? "Gallery media";
  const isVideo = isGalleryVideoMime(photo.mimeType);
  const isReady = photo.status === "READY";
  const thumbSrc = useGalleryMediaSrc(photo.id, "thumb", isReady);
  const fullSrc = useGalleryMediaSrc(photo.id, "full", isReady && isVideo);

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
        {photo.status === "FAILED" ? (photo.errorMessage ?? "Upload failed") : "Processing…"}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
        Could not load preview
      </div>
    );
  }

  if (!thumbSrc) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isVideo && fullSrc) {
    return (
      <video
        src={fullSrc}
        poster={thumbSrc}
        controls
        preload="metadata"
        className={className ?? "h-full w-full object-cover"}
        onError={() => setLoadError(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbSrc}
      alt={alt}
      className={className ?? "h-full w-full object-cover"}
      onError={() => setLoadError(true)}
    />
  );
}
