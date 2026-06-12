import { prisma } from "@/lib/prisma";
import { ACTIVITY_CATALOG, type EnabledActivitySnapshot } from "@/lib/activities/catalog";

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
  for (const type of types) {
    const defaults = defaultEventActivityConfig(type.slug);
    await prisma.eventActivity.upsert({
      where: { eventId_activityTypeId: { eventId, activityTypeId: type.id } },
      update: {},
      create: {
        eventId,
        activityTypeId: type.id,
        ...defaults,
      },
    });
  }
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
  const rows = await loadEventActivities(eventId);
  return rows
    .filter((row) => row.enabled)
    .map((row) => ({
      slug: row.activityType.slug as EnabledActivitySnapshot["slug"],
      allowGeneral: row.allowGeneral,
      allowGroup: row.allowGroup,
      allowStaff: row.allowStaff,
    }));
}

const ACTIVITY_SLUG_ALIASES: Record<string, string[]> = {
  spinner: ["spinner", "spin_to_build"],
  spin_to_build: ["spinner", "spin_to_build"],
};

function slugCandidates(activitySlug: string): string[] {
  return ACTIVITY_SLUG_ALIASES[activitySlug] ?? [activitySlug];
}

export async function getEventActivityBySlug(eventId: string, activitySlug: string) {
  await ensureEventActivityRows(eventId);
  return prisma.eventActivity.findFirst({
    where: { eventId, activityType: { slug: { in: slugCandidates(activitySlug) } } },
    include: { activityType: true },
  });
}

export async function isActivityEnabledForEvent(eventId: string, activitySlug: string) {
  const row = await getEventActivityBySlug(eventId, activitySlug);
  return Boolean(row?.enabled);
}
