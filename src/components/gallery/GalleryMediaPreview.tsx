"use client";

import { useState } from "react";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import { useGalleryMediaSrc } from "@/hooks/useGalleryMediaSrc";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import { cn } from "@/lib/cn";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryMediaPreviewProps {
  photo: GalleryPhotoRow;
  className?: string;
  layout?: "masonry" | "square";
}

export function GalleryMediaPreview({
  photo,
  className,
  layout = "square",
}: GalleryMediaPreviewProps) {
  const [loadError, setLoadError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const alt = photo.caption ?? photo.originalFilename ?? "Gallery media";
  const isVideo = isGalleryVideoMime(photo.mimeType);
  const isReady = photo.status === "READY";
  const isMasonry = layout === "masonry";
  const thumbSrc = useGalleryMediaSrc(photo.id, "thumb", isReady);
  const fullSrc = useGalleryMediaSrc(photo.id, "full", isReady && isVideo);

  const openLightbox = () => {
    if (isReady && thumbSrc && !loadError) setLightboxOpen(true);
  };

  const placeholderClass = cn(
    "flex items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground",
    isMasonry ? "min-h-[140px] w-full" : "h-full",
  );

  if (!isReady) {
    return (
      <div className={placeholderClass}>
        {photo.status === "FAILED" ? (photo.errorMessage ?? "Upload failed") : "Processing…"}
      </div>
    );
  }

  if (loadError) {
    return <div className={placeholderClass}>Could not load preview</div>;
  }

  if (!thumbSrc) {
    return <div className={cn(placeholderClass, !isMasonry && "h-full")}>Loading…</div>;
  }

  const imageClass = cn(
    isMasonry
      ? "block w-full h-auto bg-muted transition hover:opacity-95"
      : "h-full w-full object-cover transition hover:opacity-95",
    className,
  );

  return (
    <>
      {isVideo && fullSrc ? (
        <div className={cn("relative w-full", isMasonry && "bg-muted")}>
          <video
            src={fullSrc}
            poster={thumbSrc}
            controls
            preload="metadata"
            className={cn(isMasonry ? "block w-full" : "h-full w-full object-cover", className)}
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
          className={cn(
            "block w-full cursor-zoom-in overflow-hidden",
            !isMasonry && "h-full",
          )}
          onClick={openLightbox}
          aria-label="View full size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbSrc}
            alt={alt}
            className={imageClass}
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
