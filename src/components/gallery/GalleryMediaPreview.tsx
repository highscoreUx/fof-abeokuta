"use client";

import { useState } from "react";
import { useGalleryMediaSrc } from "@/hooks/useGalleryMediaSrc";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import { cn } from "@/lib/cn";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryMediaPreviewProps {
  photo: GalleryPhotoRow;
  className?: string;
  layout?: "masonry" | "square";
  /** When true, media is display-only; use overlay or onOpenLightbox for zoom. */
  passive?: boolean;
  onOpenLightbox?: () => void;
}

export function GalleryMediaPreview({
  photo,
  className,
  layout = "square",
  passive = false,
  onOpenLightbox,
}: GalleryMediaPreviewProps) {
  const [loadError, setLoadError] = useState(false);

  const alt = photo.caption ?? photo.originalFilename ?? "Gallery media";
  const isVideo = isGalleryVideoMime(photo.mimeType);
  const isReady = photo.status === "READY";
  const isMasonry = layout === "masonry";
  const thumbSrc = useGalleryMediaSrc(photo.id, "thumb", isReady);
  const fullSrc = useGalleryMediaSrc(photo.id, "full", isReady && isVideo);

  const openLightbox = () => {
    if (isReady && thumbSrc && !loadError) onOpenLightbox?.();
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
    isMasonry ? "block h-auto w-full bg-muted" : "h-full w-full object-cover",
    !passive && "cursor-zoom-in transition hover:opacity-95",
    className,
  );

  if (isVideo && fullSrc) {
    return (
      <div className={cn("relative w-full", isMasonry && "bg-muted")}>
        <video
          src={fullSrc}
          poster={thumbSrc}
          controls={!passive}
          preload="metadata"
          className={cn(isMasonry ? "block w-full" : "h-full w-full object-cover", className)}
          onError={() => setLoadError(true)}
        />
      </div>
    );
  }

  if (passive) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbSrc}
        alt={alt}
        className={imageClass}
        onError={() => setLoadError(true)}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn("block w-full overflow-hidden", !isMasonry && "h-full")}
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
  );
}
