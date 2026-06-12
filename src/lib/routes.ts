import { sanitizeNextParam } from "@/lib/post-login-redirect";

/** Single app-wide login route. Pass `returnTo` to resume a guarded page after sign-in. */
export function loginPath(returnTo?: string | null): string {
  const next = sanitizeNextParam(returnTo ?? null);
  if (!next) return "/login";
  return `/login?next=${encodeURIComponent(next)}`;
}

export function getLoginRedirectFromPathname(pathname: string, search = ""): string {
  const returnTo = search ? `${pathname}${search}` : pathname;
  return loginPath(returnTo);
}
