/** Gallery-only Google Photos Library API (server OAuth — all uploads as the configured account). */

export const GOOGLE_PHOTOS_UPLOAD_BASE = "https://photoslibrary.googleapis.com/v1/uploads";
export const GOOGLE_PHOTOS_API_BASE = "https://photoslibrary.googleapis.com/v1";

export const GOOGLE_PHOTOS_SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
  "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata",
  "https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata",
] as const;

export function isGooglePhotosConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_PHOTOS_REFRESH_TOKEN?.trim(),
  );
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_PHOTOS_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Photos is not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PHOTOS_REFRESH_TOKEN required)",
    );
  }

  return { clientId, clientSecret, refreshToken };
}
