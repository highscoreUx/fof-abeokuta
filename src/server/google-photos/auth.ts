import { getGoogleOAuthConfig } from "@/server/google-photos/config";

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

export async function getGooglePhotosAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const { clientId, clientSecret, refreshToken } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google OAuth token refresh failed: ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in?: number };
  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedAccessToken;
}
