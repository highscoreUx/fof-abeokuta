"use client";

import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { galleryMediaApiPath, type GalleryMediaSize } from "@/lib/gallery-media-client";

export function useGalleryMediaSrc(
  photoId: string,
  size: GalleryMediaSize,
  enabled: boolean,
): string | null {
  const { path } = useEventApi();
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!enabled || !accessToken) return null;
  return path(galleryMediaApiPath(photoId, size, accessToken));
}
