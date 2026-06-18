"use client";

import { useEffect, useState } from "react";
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

function galleryMediaAspectStyle(photo: GalleryPhotoRow): React.CSSProperties | undefined {
  if (photo.mediaWidth && photo.mediaHeight) {
    return { aspectRatio: `${photo.mediaWidth} / ${photo.mediaHeight}` };
  }
  return undefined;
}

export function GalleryMediaPreview({
  photo,
  className,
  passive = false,
  onOpenLightbox,
}: GalleryMediaPreviewProps) {
  const [loadError, setLoadError] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const alt = photo.caption ?? photo.originalFilename ?? "Gallery media";
  const isVideo = isGalleryVideoMime(photo.mimeType);
  const isReady = photo.status === "READY";
  const isProcessing = photo.status === "PENDING" || photo.status === "PROCESSING";
  const mediaSrc = useGalleryMediaSrc(photo.id, "full", isReady);
  const fullSrc = useGalleryMediaSrc(photo.id, "full", isReady && isVideo);
  const thumbSrc = useGalleryMediaSrc(photo.id, "thumb", isReady && isVideo);

  useEffect(() => {
    setMediaLoaded(false);
    setLoadError(false);
  }, [photo.id, mediaSrc, fullSrc]);

  const openLightbox = () => {
    if (isReady && mediaSrc && mediaLoaded && !loadError) onOpenLightbox?.();
  };

  const errorClass =
    "flex h-full w-full items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground";

  const aspectStyle = galleryMediaAspectStyle(photo);
  const showShimmer =
    isProcessing ||
    (isReady && !loadError && !mediaLoaded && Boolean(isVideo ? fullSrc : mediaSrc));

  if (isProcessing) {
    const localPreview = photo.thumbnailUrl ?? photo.url;
    if (localPreview?.startsWith("blob:")) {
      return (
        <div className="relative h-full w-full" style={aspectStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={localPreview}
            alt={alt}
            className="h-full w-full object-cover opacity-80"
            decoding="async"
          />
          <GalleryShimmer
            className="absolute inset-0 h-full w-full rounded-2xl"
            label="Uploading…"
          />
        </div>
      );
    }

    return (
      <div className="relative h-full w-full" style={aspectStyle}>
        <GalleryShimmer className="h-full w-full rounded-2xl" label="Processing upload" />
      </div>
    );
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

  const mediaClass = cn(
    "h-full w-full object-cover",
    !passive && "cursor-zoom-in transition-opacity duration-200",
    !mediaLoaded && "opacity-0",
    mediaLoaded && "opacity-100",
    className,
  );

  const mediaFrame = (
    <div className="relative h-full w-full" style={aspectStyle}>
      {showShimmer && (
        <GalleryShimmer
          className="absolute inset-0 z-10 h-full w-full rounded-2xl"
          label={mediaSrc || fullSrc ? "Loading media" : "Fetching media"}
        />
      )}

      {isVideo && fullSrc ? (
        <video
          src={fullSrc}
          poster={thumbSrc ?? undefined}
          controls={!passive}
          preload="metadata"
          className={mediaClass}
          width={photo.mediaWidth ?? undefined}
          height={photo.mediaHeight ?? undefined}
          onLoadedData={() => setMediaLoaded(true)}
          onError={() => setLoadError(true)}
        />
      ) : mediaSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaSrc}
          alt={alt}
          className={mediaClass}
          decoding="async"
          width={photo.mediaWidth ?? undefined}
          height={photo.mediaHeight ?? undefined}
          onLoad={() => setMediaLoaded(true)}
          onError={() => setLoadError(true)}
        />
      ) : (
        !showShimmer && (
          <GalleryShimmer className="h-full w-full rounded-2xl" label="Fetching media" />
        )
      )}
    </div>
  );

  if (isVideo || passive) {
    return mediaFrame;
  }

  return (
    <button
      type="button"
      className="block h-full w-full overflow-hidden"
      onClick={openLightbox}
      aria-label="View full size"
    >
      {mediaFrame}
    </button>
  );
}
