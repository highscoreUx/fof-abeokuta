import { cn } from "@/lib/cn";

interface GalleryShimmerProps {
  className?: string;
  label?: string;
}

export function GalleryShimmer({ className, label = "Loading media" }: GalleryShimmerProps) {
  return (
    <div
      className={cn("gallery-shimmer", className)}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
