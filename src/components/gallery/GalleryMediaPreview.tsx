"use client";

import { useState } from "react";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import { useGalleryMediaSrc } from "@/hooks/useGalleryMediaSrc";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryMediaPreviewProps {
  photo: GalleryPhotoRow;
  className?: string;
}

export function GalleryMediaPreview({ photo, className }: GalleryMediaPreviewProps) {
  const [loadError, setLoadError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const alt = photo.caption ?? photo.originalFilename ?? "Gallery media";
  const isVideo = isGalleryVideoMime(photo.mimeType);
  const isReady = photo.status === "READY";
  const thumbSrc = useGalleryMediaSrc(photo.id, "thumb", isReady);
  const fullSrc = useGalleryMediaSrc(photo.id, "full", isReady && isVideo);

  const openLightbox = () => {
    if (isReady && thumbSrc && !loadError) setLightboxOpen(true);
  };

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

  return (
    <>
      {isVideo && fullSrc ? (
        <div className="relative h-full w-full">
          <video
            src={fullSrc}
            poster={thumbSrc}
            controls
            preload="metadata"
            className={className ?? "h-full w-full object-cover"}
            onError={() => setLoadError(true)}
          />
          <button
            type="button"
            className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
            onClick={openLightbox}
            aria-label="Expand video"
          >
            Expand
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="block h-full w-full cursor-zoom-in overflow-hidden"
          onClick={openLightbox}
          aria-label="View full size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbSrc}
            alt={alt}
            className={className ?? "h-full w-full object-cover transition hover:opacity-95"}
            onError={() => setLoadError(true)}
          />
        </button>
      )}

      <GalleryLightbox
        photo={photo}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
