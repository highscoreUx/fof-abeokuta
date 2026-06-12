import type { AuthUser } from "@/types";
import type { ActivitySlug } from "@/lib/activities/catalog";

export function userHasEnabledActivity(
  user: Pick<AuthUser, "enabledActivities"> | null | undefined,
  slug: ActivitySlug,
): boolean {
  return Boolean(
    user?.enabledActivities?.some(
      (entry) =>
        entry.slug === slug ||
        (slug === "spinner" && (entry.slug as string) === "spin_to_build"),
    ),
  );
}

export function eventHasAnyEnabledActivity(
  user: Pick<AuthUser, "enabledActivities"> | null | undefined,
): boolean {
  return (user?.enabledActivities?.length ?? 0) > 0;
}
