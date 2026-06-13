import { prisma } from "@/lib/prisma";
import { CACHE_TTL, cacheGetOrSet } from "@/lib/cache/index";
import { invalidateEventCaches } from "@/lib/cache/invalidate";
import { isTeamingEnabled } from "@/lib/team-settings";
import {
  ACTIVITY_CATALOG,
  type ActivityInstanceScope,
  type EnabledActivitySnapshot,
  validateInstanceScopeAgainstEvent,
} from "@/lib/activities/catalog";

export interface CachedEventActivityRow {
  slug: string;
  enabled: boolean;
  allowGeneral: boolean;
  allowGroup: boolean;
  allowStaff: boolean;
}

function defaultEventActivityConfig(slug: string) {
  if (slug === "kahoot") {
    return { enabled: true, allowGeneral: true, allowGroup: false, allowStaff: false };
  }
  if (slug === "spinner" || slug === "tic_tac_toe") {
    return { enabled: true, allowGeneral: false, allowGroup: true, allowStaff: false };
  }
  if (slug === "survey") {
    return { enabled: true, allowGeneral: true, allowGroup: true, allowStaff: false };
  }
  return { enabled: true, allowGeneral: true, allowGroup: true, allowStaff: false };
}

export async function seedActivityTypes() {
  for (const entry of ACTIVITY_CATALOG) {
    await prisma.activityType.upsert({
      where: { slug: entry.slug },
      update: {
        name: entry.name,
        description: entry.description,
        sortOrder: entry.sortOrder,
      },
      create: {
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        sortOrder: entry.sortOrder,
      },
    });
  }
}

export async function ensureEventActivityRows(eventId: string) {
  await seedActivityTypes();
  const types = await prisma.activityType.findMany({ orderBy: { sortOrder: "asc" } });
  let created = false;

  for (const type of types) {
    const defaults = defaultEventActivityConfig(type.slug);
    const existing = await prisma.eventActivity.findUnique({
      where: { eventId_activityTypeId: { eventId, activityTypeId: type.id } },
    });
    if (existing) continue;

    await prisma.eventActivity.create({
      data: {
        eventId,
        activityTypeId: type.id,
        ...defaults,
      },
    });
    created = true;
  }

  if (created) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { slug: true },
    });
    await invalidateEventCaches(eventId, event?.slug);
  }
}

async function loadActivityRowsFromDb(eventId: string): Promise<CachedEventActivityRow[]> {
  const rows = await prisma.eventActivity.findMany({
    where: { eventId },
    include: { activityType: true },
    orderBy: { activityType: { sortOrder: "asc" } },
  });

  return rows.map((row) => ({
    slug: row.activityType.slug,
    enabled: row.enabled,
    allowGeneral: row.allowGeneral,
    allowGroup: row.allowGroup,
    allowStaff: row.allowStaff,
  }));
}

export async function getCachedEventActivities(eventId: string): Promise<CachedEventActivityRow[]> {
  return cacheGetOrSet(
    `event:id:${eventId}:activities`,
    CACHE_TTL.activities,
    () => loadActivityRowsFromDb(eventId),
  );
}

export async function loadEventActivities(eventId: string) {
  await ensureEventActivityRows(eventId);
  return prisma.eventActivity.findMany({
    where: { eventId },
    include: { activityType: true },
    orderBy: { activityType: { sortOrder: "asc" } },
  });
}

export async function loadEnabledActivitiesSnapshot(
  eventId: string,
): Promise<EnabledActivitySnapshot[]> {
  const [rows, teamingEnabled] = await Promise.all([
    getCachedEventActivities(eventId),
    isTeamingEnabled(eventId),
  ]);

  return rows
    .filter((row) => row.enabled)
    .flatMap((row) => {
      if (!teamingEnabled) {
        if (!row.allowGeneral) return [];
        return [
          {
            slug: row.slug as EnabledActivitySnapshot["slug"],
            allowGeneral: true,
            allowGroup: false,
            allowStaff: row.allowStaff,
          },
        ];
      }

      return [
        {
          slug: row.slug as EnabledActivitySnapshot["slug"],
          allowGeneral: row.allowGeneral,
          allowGroup: row.allowGroup,
          allowStaff: row.allowStaff,
        },
      ];
    });
}

const ACTIVITY_SLUG_ALIASES: Record<string, string[]> = {
  spinner: ["spinner", "spin_to_build"],
  spin_to_build: ["spinner", "spin_to_build"],
};

function slugCandidates(activitySlug: string): string[] {
  return ACTIVITY_SLUG_ALIASES[activitySlug] ?? [activitySlug];
}

export async function getEventActivityBySlug(eventId: string, activitySlug: string) {
  const rows = await getCachedEventActivities(eventId);
  const candidates = slugCandidates(activitySlug);
  const cached = rows.find((row) => candidates.includes(row.slug));
  if (!cached) return null;

  return prisma.eventActivity.findFirst({
    where: { eventId, activityType: { slug: { in: candidates } } },
    include: { activityType: true },
  });
}

export async function isActivityEnabledForEvent(eventId: string, activitySlug: string) {
  const rows = await getCachedEventActivities(eventId);
  const candidates = slugCandidates(activitySlug);
  const row = rows.find((r) => candidates.includes(r.slug));
  return Boolean(row?.enabled);
}

export async function validateActivityInstanceScope(
  eventId: string,
  eventActivity: { allowGeneral: boolean; allowGroup: boolean },
  scope: ActivityInstanceScope,
): Promise<string | null> {
  const teamingEnabled = await isTeamingEnabled(eventId);
  return validateInstanceScopeAgainstEvent(eventActivity, scope, { teamingEnabled });
}

export { invalidateEventCaches };
