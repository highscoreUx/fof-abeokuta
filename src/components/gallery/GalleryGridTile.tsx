"use client";

import { useState } from "react";
import { MagnifyingGlassPlus, Trash } from "@phosphor-icons/react";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import { GalleryMediaPreview } from "@/components/gallery/GalleryMediaPreview";
import { galleryGridTileClassName } from "@/components/gallery/GalleryGrid";
import { cn } from "@/lib/cn";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import type { GalleryPhotoRow } from "@/types/gallery";

interface GalleryGridTileProps {
  photo: GalleryPhotoRow;
  canDelete: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  native?: boolean;
}

function GalleryTileAction({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
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

export function GalleryGridTile({
  photo,
  canDelete,
  onDelete,
  isDeleting,
  native = false,
}: GalleryGridTileProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const showActions = photo.status === "READY";

  const openLightbox = () => {
    if (showActions) setLightboxOpen(true);
  };

  return (
    <figure
      className={galleryGridTileClassName(
        cn(
          native ? "bg-muted" : "group bg-muted shadow-sm",
          photo.status === "FAILED" && "opacity-80",
          native && showActions && "cursor-pointer active:opacity-90",
        ),
        native,
      )}
      onClick={native && showActions ? openLightbox : undefined}
      onKeyDown={
        native && showActions
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openLightbox();
              }
            }
          : undefined
      }
      role={native && showActions ? "button" : undefined}
      tabIndex={native && showActions ? 0 : undefined}
    >
      <GalleryMediaPreview
        photo={photo}
        passive={native || showActions}
        onOpenLightbox={openLightbox}
      />

      {native && showActions && isGalleryVideoMime(photo.mimeType) && (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white">
          VIDEO
        </span>
      )}

      {native && canDelete && showActions && (
        <GalleryTileAction
          label="Delete"
          disabled={isDeleting}
          className="absolute right-1 top-1 h-8 w-8 bg-black/55 hover:bg-red-600/90"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash size={16} weight="bold" aria-hidden />
        </GalleryTileAction>
      )}

      {!native && showActions && (
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
