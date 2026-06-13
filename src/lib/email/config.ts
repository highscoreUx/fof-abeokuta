/** App-side email config (templates, links). SMTP lives in src/server/email-worker/config.ts. */

export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return "http://localhost:3000";
  return url.replace(/\/$/, "");
}
