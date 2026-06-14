export type GalleryPhotoStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type GalleryFilter = "all" | "official" | "mine" | "team";

export interface GalleryPhotoRow {
  id: string;
  eventId: string;
  uploadedByUserId: string | null;
  uploadedByTeamId: string | null;
  uploadedByTeamLetter: string | null;
  uploadedByTeamName: string | null;
  isOfficial: boolean;
  status: GalleryPhotoStatus;
  mimeType: string;
  mediaWidth: number | null;
  mediaHeight: number | null;
  url: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  originalFilename: string | null;
  errorMessage: string | null;
  uploadedAt: string;
  processedAt: string | null;
  uploaderName: string | null;
  uploaderUsername: string | null;
}

export interface EventPhotoLibraryRow {
  id: string;
  eventId: string;
  googleAlbumId: string | null;
  /** Public Google Photos album link (optional — share album manually, then paste here). */
  officialGalleryUrl: string | null;
}

export interface GalleryListResponse {
  library: EventPhotoLibraryRow;
  data: GalleryPhotoRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
