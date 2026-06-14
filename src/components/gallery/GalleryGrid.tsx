import { cn } from "@/lib/cn";

interface GalleryGridProps {
  children: React.ReactNode;
  className?: string;
}

export function galleryGridClassName(className?: string) {
  return cn(
    "grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
    className,
  );
}

export function GalleryGrid({ children, className }: GalleryGridProps) {
  return <div className={galleryGridClassName(className)}>{children}</div>;
}

export function galleryGridTileClassName(className?: string) {
  return cn("gallery-grid-tile relative min-w-0 overflow-hidden rounded-2xl", className);
}
