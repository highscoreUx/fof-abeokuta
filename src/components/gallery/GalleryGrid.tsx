import { cn } from "@/lib/cn";

interface GalleryGridProps {
  children: React.ReactNode;
  className?: string;
}

export function galleryGridClassName(className?: string, native = false) {
  if (native) {
    return cn("grid w-full min-w-0 grid-cols-3 gap-0.5 bg-muted/40", className);
  }
  return cn(
    "grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
    className,
  );
}

export function GalleryGrid({
  children,
  className,
  native = false,
}: GalleryGridProps & { native?: boolean }) {
  return <div className={galleryGridClassName(className, native)}>{children}</div>;
}

export function galleryGridTileClassName(className?: string, native = false) {
  return cn(
    "gallery-grid-tile relative aspect-square min-w-0 overflow-hidden",
    !native && "rounded-2xl",
    className,
  );
}
