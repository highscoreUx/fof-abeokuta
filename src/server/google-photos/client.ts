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
  filename?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMediaItemPayload(data: unknown): GooglePhotosMediaItem | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const nested = record.mediaItem;
  const item = (nested && typeof nested === "object" ? nested : record) as Record<
    string,
    unknown
  >;
  const id = typeof item.id === "string" ? item.id : null;
  const baseUrl = typeof item.baseUrl === "string" ? item.baseUrl : null;
  const mimeType = typeof item.mimeType === "string" ? item.mimeType : "image/jpeg";
  if (!id || !baseUrl) return null;
  return {
    id,
    baseUrl,
    mimeType,
    filename: typeof item.filename === "string" ? item.filename : undefined,
  };
}

export async function getGooglePhotosMediaItem(
  mediaItemId: string,
  options?: { retries?: number; delayMs?: number },
): Promise<GooglePhotosMediaItem> {
  const retries = options?.retries ?? 6;
  const delayMs = options?.delayMs ?? 750;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await googlePhotosFetch(`/mediaItems/${mediaItemId}`);
      if (!response.ok) {
        throw new Error(`Google Photos media item get failed: ${await response.text()}`);
      }
      const parsed = parseMediaItemPayload(await response.json());
      if (parsed) return parsed;
      throw new Error("Google Photos media item missing baseUrl");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Google Photos media item get failed");
      if (attempt < retries - 1) {
        await sleep(delayMs * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("Google Photos media item get failed");
}

export async function searchAlbumMediaItemByFilename(
  albumId: string,
  fileName: string,
): Promise<GooglePhotosMediaItem | null> {
  const response = await googlePhotosFetch("/mediaItems:search", {
    method: "POST",
    body: JSON.stringify({ albumId, pageSize: 50 }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    mediaItems?: Array<{ id?: string; baseUrl?: string; mimeType?: string; filename?: string }>;
  };

  const items = data.mediaItems ?? [];
  const match =
    items.find((item) => item.filename === fileName && item.id) ??
    items.find((item) => item.id);

  if (!match?.id) return null;

  if (match.baseUrl && match.mimeType) {
    return {
      id: match.id,
      baseUrl: match.baseUrl,
      mimeType: match.mimeType,
      filename: match.filename,
    };
  }

  return getGooglePhotosMediaItem(match.id);
}

/** Google baseUrls must not already include transform params when appending ours. */
export function googlePhotosBaseRoot(baseUrl: string): string {
  const equalsIndex = baseUrl.indexOf("=");
  return equalsIndex === -1 ? baseUrl : baseUrl.slice(0, equalsIndex);
}

export function googleMediaDisplayUrls(baseUrl: string, mimeType: string) {
  const root = googlePhotosBaseRoot(baseUrl);

  if (mimeType.startsWith("video/")) {
    return {
      url: `${root}=dv`,
      thumbnailUrl: `${root}=w400-h400`,
    };
  }

  return {
    url: `${root}=w1600-h1600`,
    thumbnailUrl: `${root}=w400-h400`,
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

export async function fetchGooglePhotosMediaBytes(googleUrl: string): Promise<Response> {
  const accessToken = await getGooglePhotosAccessToken();
  return fetch(googleUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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
  if (!uploadToken || uploadToken === "Success") {
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

  const createBody = await createResponse.text();
  if (!createResponse.ok) {
    throw new Error(`Google Photos mediaItems:batchCreate failed: ${createBody}`);
  }

  let payload: {
    newMediaItemResults?: Array<{
      status?: { message?: string; code?: number };
      mediaItem?: {
        id?: string;
        baseUrl?: string;
        mimeType?: string;
        filename?: string;
      };
    }>;
  };

  try {
    payload = JSON.parse(createBody) as typeof payload;
  } catch {
    throw new Error(`Google Photos batchCreate returned invalid JSON: ${createBody.slice(0, 200)}`);
  }

  const result = payload.newMediaItemResults?.[0];
  if (!result) {
    throw new Error("Google Photos did not return a create result");
  }

  const statusCode = result.status?.code ?? 0;
  const statusMessage = result.status?.message?.trim();
  if (statusCode !== 0 || (statusMessage && statusMessage !== "Success")) {
    throw new Error(statusMessage || `Google Photos create failed (code ${statusCode})`);
  }

  const inline = result.mediaItem;
  const mediaItemId = inline?.id;

  if (mediaItemId) {
    const withUrl = parseMediaItemPayload(inline);
    if (withUrl) return withUrl;
    return getGooglePhotosMediaItem(mediaItemId);
  }

  const found = await searchAlbumMediaItemByFilename(input.albumId, input.fileName);
  if (found) return found;

  throw new Error("Google Photos create succeeded but no media item id was returned");
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
