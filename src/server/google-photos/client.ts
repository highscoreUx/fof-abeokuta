import { getGooglePhotosAccessToken } from "@/server/google-photos/auth";
import {
  GOOGLE_PHOTOS_API_BASE,
  GOOGLE_PHOTOS_UPLOAD_BASE,
} from "@/server/google-photos/config";

export interface GooglePhotosAlbum {
  id: string;
  title: string;
  productUrl?: string;
}

export interface GooglePhotosMediaItem {
  id: string;
  baseUrl: string;
  mimeType: string;
}

export function googleMediaDisplayUrls(baseUrl: string, mimeType: string) {
  if (mimeType.startsWith("video/")) {
    return {
      url: `${baseUrl}=dv`,
      thumbnailUrl: `${baseUrl}=w400-h400-c`,
    };
  }

  return {
    url: `${baseUrl}=w1600-h1600`,
    thumbnailUrl: `${baseUrl}=w400-h400-c`,
  };
}

/** @deprecated use googleMediaDisplayUrls */
export function googlePhotoDisplayUrls(baseUrl: string) {
  return googleMediaDisplayUrls(baseUrl, "image/jpeg");
}

/** Google baseUrl leases are short-lived — cache ~50 minutes locally. */
export function googlePhotoUrlExpiresAt(): Date {
  return new Date(Date.now() + 50 * 60 * 1000);
}

export function isGooglePhotoUrlExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= Date.now() + 60_000;
}

async function googlePhotosFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = await getGooglePhotosAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${GOOGLE_PHOTOS_API_BASE}${path}`, {
    ...init,
    headers,
  });
}

export async function createGooglePhotosAlbum(title: string): Promise<GooglePhotosAlbum> {
  const response = await googlePhotosFetch("/albums", {
    method: "POST",
    body: JSON.stringify({ album: { title } }),
  });

  if (!response.ok) {
    throw new Error(`Google Photos album create failed: ${await response.text()}`);
  }

  const data = (await response.json()) as GooglePhotosAlbum;
  return data;
}

export async function getGooglePhotosAlbum(albumId: string): Promise<GooglePhotosAlbum> {
  const response = await googlePhotosFetch(`/albums/${albumId}`);
  if (!response.ok) {
    throw new Error(`Google Photos album get failed: ${await response.text()}`);
  }
  return (await response.json()) as GooglePhotosAlbum;
}

export async function getGooglePhotosMediaItem(mediaItemId: string): Promise<GooglePhotosMediaItem> {
  const response = await googlePhotosFetch(`/mediaItems/${mediaItemId}`);
  if (!response.ok) {
    throw new Error(`Google Photos media item get failed: ${await response.text()}`);
  }
  return (await response.json()) as GooglePhotosMediaItem;
}

export async function uploadGooglePhotosMediaToAlbum(input: {
  albumId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  description?: string;
}): Promise<GooglePhotosMediaItem> {
  const accessToken = await getGooglePhotosAccessToken();

  const uploadResponse = await fetch(GOOGLE_PHOTOS_UPLOAD_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "X-Goog-Upload-Content-Type": input.mimeType,
      "X-Goog-Upload-Protocol": "raw",
    },
    body: new Uint8Array(input.buffer),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Google Photos byte upload failed: ${await uploadResponse.text()}`);
  }

  const uploadToken = (await uploadResponse.text()).trim();
  if (!uploadToken) {
    throw new Error("Google Photos upload token missing");
  }

  const createResponse = await googlePhotosFetch("/mediaItems:batchCreate", {
    method: "POST",
    body: JSON.stringify({
      albumId: input.albumId,
      newMediaItems: [
        {
          description: input.description,
          simpleMediaItem: {
            fileName: input.fileName,
            uploadToken,
          },
        },
      ],
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Google Photos mediaItems:batchCreate failed: ${await createResponse.text()}`);
  }

  const payload = (await createResponse.json()) as {
    newMediaItemResults?: Array<{
      status?: { message?: string };
      mediaItem?: GooglePhotosMediaItem;
    }>;
  };

  const result = payload.newMediaItemResults?.[0];
  const mediaItem = result?.mediaItem;
  if (!mediaItem?.id || !mediaItem.baseUrl) {
    throw new Error(result?.status?.message ?? "Google Photos did not return a media item");
  }

  return mediaItem;
}

export async function removeGooglePhotosMediaFromAlbum(input: {
  albumId: string;
  mediaItemId: string;
}): Promise<void> {
  const response = await googlePhotosFetch(`/albums/${input.albumId}:batchRemoveMediaItems`, {
    method: "POST",
    body: JSON.stringify({
      mediaItemIds: [input.mediaItemId],
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Photos batchRemoveMediaItems failed: ${await response.text()}`);
  }
}
