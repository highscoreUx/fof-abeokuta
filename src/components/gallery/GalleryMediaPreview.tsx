"use client";

import { useState } from "react";
import { GalleryShimmer } from "@/components/gallery/GalleryShimmer";
import { useGalleryMediaSrc } from "@/hooks/useGalleryMediaSrc";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import { cn } from "@/lib/cn";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryMediaPreviewProps {
  photo: GalleryPhotoRow;
  className?: string;
  /** When true, media is display-only; use overlay or onOpenLightbox for zoom. */
  passive?: boolean;
  onOpenLightbox?: () => void;
}

export function GalleryMediaPreview({
  photo,
  className,
  passive = false,
  onOpenLightbox,
}: GalleryMediaPreviewProps) {
  const [loadError, setLoadError] = useState(false);

  const alt = photo.caption ?? photo.originalFilename ?? "Gallery media";
  const isVideo = isGalleryVideoMime(photo.mimeType);
  const isReady = photo.status === "READY";
  const isProcessing = photo.status === "PENDING" || photo.status === "PROCESSING";
  const thumbSrc = useGalleryMediaSrc(photo.id, "thumb", isReady);
  const fullSrc = useGalleryMediaSrc(photo.id, "full", isReady && isVideo);

  const openLightbox = () => {
    if (isReady && thumbSrc && !loadError) onOpenLightbox?.();
  };

  const errorClass =
    "flex h-full w-full items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground";

  if (isProcessing) {
    return <GalleryShimmer className="h-full w-full rounded-2xl" label="Processing upload" />;
  }

  if (!isReady) {
    return (
      <div className={errorClass}>
        {photo.errorMessage ?? "Upload failed"}
      </div>
    );
  }

  if (loadError) {
    return <div className={errorClass}>Could not load preview</div>;
  }

  if (!thumbSrc) {
    return <GalleryShimmer className="h-full w-full rounded-2xl" label="Loading media" />;
  }

  const mediaClass = cn(
    "h-full w-full object-cover",
    !passive && "cursor-zoom-in transition hover:opacity-95",
    className,
  );

  if (isVideo && fullSrc) {
    return (
      <video
        src={fullSrc}
        poster={thumbSrc}
        controls={!passive}
        preload="metadata"
        className={mediaClass}
        onError={() => setLoadError(true)}
      />
    );
  }

  if (passive) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbSrc}
        alt={alt}
        className={mediaClass}
        decoding="async"
        onError={() => setLoadError(true)}
      />
    );
  }

  return (
    <button
      type="button"
      className="block h-full w-full overflow-hidden"
      onClick={openLightbox}
      aria-label="View full size"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbSrc}
        alt={alt}
        className={mediaClass}
        decoding="async"
        onError={() => setLoadError(true)}
      />
    </button>
  );
}
