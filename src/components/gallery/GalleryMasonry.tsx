import { cn } from "@/lib/cn";

interface GalleryMasonryProps {
  children: React.ReactNode;
  className?: string;
}

export function GalleryMasonry({ children, className }: GalleryMasonryProps) {
  return (
    <div
      className={cn(
        "columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function galleryMasonryItemClassName(className?: string) {
  return cn("mb-3 break-inside-avoid", className);
}
