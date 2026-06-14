export type GalleryMediaSize = "thumb" | "full";

export function galleryMediaApiPath(
  photoId: string,
  size: GalleryMediaSize,
  accessToken: string,
): string {
  const params = new URLSearchParams({
    size,
    access_token: accessToken,
  });
  return `/gallery/${photoId}/media?${params.toString()}`;
}
