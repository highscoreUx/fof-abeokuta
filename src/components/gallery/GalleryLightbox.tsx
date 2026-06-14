"use client";

import { useEffect } from "react";
import { useGalleryMediaSrc } from "@/hooks/useGalleryMediaSrc";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryLightboxProps {
  photo: GalleryPhotoRow;
  open: boolean;
  onClose: () => void;
}

export function GalleryLightbox({ photo, open, onClose }: GalleryLightboxProps) {
  const isVideo = isGalleryVideoMime(photo.mimeType);
  const isReady = photo.status === "READY";
  const fullSrc = useGalleryMediaSrc(photo.id, "full", open && isReady);
  const thumbSrc = useGalleryMediaSrc(photo.id, "thumb", open && isReady && isVideo);

  const alt = photo.caption ?? photo.originalFilename ?? "Gallery media";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !isReady) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Gallery media preview"
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:bg-black/70"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>

      <div
        className="flex max-h-[92vh] max-w-[92vw] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {!fullSrc ? (
          <p className="text-sm text-white/80">Loading…</p>
        ) : isVideo ? (
          <video
            src={fullSrc}
            poster={thumbSrc ?? undefined}
            controls
            autoPlay
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fullSrc}
            alt={alt}
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}
