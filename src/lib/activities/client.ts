import type { AuthUser } from "@/types";
import type { ActivitySlug } from "@/lib/activities/catalog";
import { resolveActivitySlug, slugCandidates } from "@/lib/activities/manifest";

export function userHasEnabledActivity(
  user: Pick<AuthUser, "enabledActivities"> | null | undefined,
  slug: ActivitySlug,
): boolean {
  const canonical = resolveActivitySlug(slug);
  const candidates = new Set(slugCandidates(canonical));

  return Boolean(
    user?.enabledActivities?.some((entry) => candidates.has(entry.slug)),
  );
}

export function eventHasAnyEnabledActivity(
  user: Pick<AuthUser, "enabledActivities"> | null | undefined,
): boolean {
  return (user?.enabledActivities?.length ?? 0) > 0;
}
