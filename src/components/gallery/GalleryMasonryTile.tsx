"use client";

import { useState } from "react";
import { MagnifyingGlassPlus, Trash } from "@phosphor-icons/react";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import { GalleryMediaPreview } from "@/components/gallery/GalleryMediaPreview";
import { galleryMasonryItemClassName } from "@/components/gallery/GalleryMasonry";
import { cn } from "@/lib/cn";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryMasonryTileProps {
  photo: GalleryPhotoRow;
  canDelete: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}

function GalleryTileAction({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition",
        "hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GalleryMasonryTile({
  photo,
  canDelete,
  onDelete,
  isDeleting,
}: GalleryMasonryTileProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const showActions = photo.status === "READY";

  return (
    <figure
      className={galleryMasonryItemClassName(
        cn("group relative overflow-hidden rounded-xl", photo.status !== "READY" && "opacity-80"),
      )}
    >
      <GalleryMediaPreview
        photo={photo}
        layout="masonry"
        passive={showActions}
        onOpenLightbox={() => setLightboxOpen(true)}
      />

      {showActions && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center gap-3 bg-black/35",
            "opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <GalleryTileAction label="Zoom" onClick={() => setLightboxOpen(true)}>
            <MagnifyingGlassPlus size={20} weight="bold" aria-hidden />
          </GalleryTileAction>
          {canDelete && (
            <GalleryTileAction
              label="Delete"
              disabled={isDeleting}
              className="hover:bg-red-600/90"
              onClick={() => onDelete()}
            >
              <Trash size={20} weight="bold" aria-hidden />
            </GalleryTileAction>
          )}
        </div>
      )}

      <GalleryLightbox
        photo={photo}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </figure>
  );
}
