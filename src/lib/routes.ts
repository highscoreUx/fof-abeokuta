import { RESERVED_EVENT_SLUGS } from "@/lib/reserved-slugs";

export function loginPath(pathPrefix: string): string {
  return pathPrefix ? `${pathPrefix}/login` : "/login";
}

export function getLoginRedirectFromPathname(pathname: string): string {
  const segment = pathname.split("/")[1];
  if (segment && !RESERVED_EVENT_SLUGS.has(segment)) {
    return `/${segment}/login`;
  }
  return "/login";
}
