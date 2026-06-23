#!/usr/bin/env node
/**
 * Google Photos OAuth helper for server-side gallery uploads.
 *
 * Silent refresh (uses GOOGLE_PHOTOS_REFRESH_TOKEN — same as the app):
 *   node scripts/google-photos-oauth.mjs refresh
 *   pnpm google-photos:refresh
 *
 * Re-authorize when you see invalid_grant (expired/revoked refresh token):
 *   node scripts/google-photos-oauth.mjs authorize
 *   pnpm google-photos:authorize
 *
 * Env (.env or .env.local):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_PHOTOS_REFRESH_TOKEN   (refresh mode)
 *   GOOGLE_OAUTH_REDIRECT_URI       (optional, default http://localhost:3456/oauth2callback)
 *
 * Google Cloud Console → OAuth client → Authorized redirect URIs must include the redirect URI above.
 */

import { config as loadEnv } from "dotenv";
import { createServer } from "node:http";
import { URL } from "node:url";

loadEnv({ path: ".env.local" });
loadEnv();

const SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
  "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata",
  "https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata",
];

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_REDIRECT_URI = "http://localhost:3456/oauth2callback";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name} in environment.`);
    process.exit(1);
  }
  return value;
}

function getOAuthClient() {
  return {
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI,
  };
}

async function exchangeRefreshToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(`Google OAuth token refresh failed: ${text}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function exchangeAuthCode({ clientId, clientSecret, redirectUri, code }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Code exchange failed: ${text}`);
  }

  return data;
}

function buildAuthorizeUrl({ clientId, redirectUri }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function runRefresh() {
  const { clientId, clientSecret } = getOAuthClient();
  const refreshToken = requireEnv("GOOGLE_PHOTOS_REFRESH_TOKEN");

  console.log("Refreshing Google Photos access token…");

  try {
    const data = await exchangeRefreshToken({ clientId, clientSecret, refreshToken });
    const expiresIn = data.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    console.log("OK — silent refresh succeeded.");
    console.log(`  access_token: ${data.access_token?.slice(0, 12)}… (${data.access_token?.length ?? 0} chars)`);
    console.log(`  expires_in:   ${expiresIn}s`);
    console.log(`  expires_at:   ${expiresAt.toISOString()}`);
    if (data.scope) console.log(`  scope:        ${data.scope}`);
    console.log("\nYour GOOGLE_PHOTOS_REFRESH_TOKEN is still valid. No action needed.");
  } catch (error) {
    const data = error.data;
    if (data?.error === "invalid_grant") {
      console.error("Refresh token is expired or revoked (invalid_grant).");
      console.error("Silent refresh cannot recover from this — run:");
      console.error("  pnpm google-photos:authorize");
      console.error("\nThen update GOOGLE_PHOTOS_REFRESH_TOKEN in .env with the new value.");
      process.exit(1);
    }
    console.error(error.message ?? error);
    process.exit(1);
  }
}

function listenForAuthCode(redirectUri) {
  const redirect = new URL(redirectUri);
  const port = Number(redirect.port) || (redirect.protocol === "https:" ? 443 : 80);
  const pathname = redirect.pathname || "/";

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const reqUrl = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

      if (reqUrl.pathname !== pathname) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }

      const error = reqUrl.searchParams.get("error");
      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<p>Authorization failed: ${error}</p><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      const code = reqUrl.searchParams.get("code");
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<p>Missing authorization code.</p>");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<p>Authorization received. You can close this tab and return to the terminal.</p>",
      );
      server.close();
      resolve(code);
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      console.log(`Listening for OAuth callback on ${redirectUri}`);
    });

    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for authorization (5 minutes)."));
    }, 5 * 60 * 1000);
  });
}

async function runAuthorize() {
  const { clientId, clientSecret, redirectUri } = getOAuthClient();
  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri });

  console.log("Google Photos re-authorization");
  console.log("────────────────────────────");
  console.log(`Redirect URI (must be in Google Cloud Console): ${redirectUri}`);
  console.log(`Scopes: ${SCOPES.join(", ")}\n`);
  console.log("1. Open this URL in the browser (sign in as the gallery Google account):\n");
  console.log(authorizeUrl);
  console.log("\n2. Approve access. This tab will redirect to localhost when done.\n");

  const code = await listenForAuthCode(redirectUri);
  console.log("Exchanging authorization code for tokens…");

  const data = await exchangeAuthCode({ clientId, clientSecret, redirectUri, code });

  if (!data.refresh_token) {
    console.error(
      "No refresh_token in response. Try again with prompt=consent (already set) or revoke app access at",
    );
    console.error("https://myaccount.google.com/permissions and re-run authorize.");
    if (data.access_token) {
      console.error("\nReceived access_token only — cannot update long-lived credentials.");
    }
    process.exit(1);
  }

  console.log("\nSuccess. Add or replace in .env / .env.local:\n");
  console.log(`GOOGLE_PHOTOS_REFRESH_TOKEN=${data.refresh_token}`);
  console.log(`\naccess_token expires in ${data.expires_in ?? "?"}s (app refreshes this automatically).`);
  console.log("\nVerify with: pnpm google-photos:refresh");
}

const mode = (process.argv[2] ?? "refresh").toLowerCase();

if (mode === "refresh") {
  await runRefresh();
} else if (mode === "authorize" || mode === "auth") {
  await runAuthorize();
} else {
  console.error(`Unknown mode: ${mode}`);
  console.error("Usage: node scripts/google-photos-oauth.mjs [refresh|authorize]");
  process.exit(1);
}
