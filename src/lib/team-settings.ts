import { CACHE_TTL, cacheGetOrSet } from "@/lib/cache/index";
import { invalidateEventCaches } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/prisma";

export const TEAMING_ENABLED_KEY = "teaming_enabled";

export function parseTeamingEnabled(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  return value !== "false";
}

export async function isTeamingEnabled(eventId: string): Promise<boolean> {
  return cacheGetOrSet(`event:id:${eventId}:teaming`, CACHE_TTL.settings, async () => {
    const setting = await prisma.appSetting.findUnique({
      where: { eventId_key: { eventId, key: TEAMING_ENABLED_KEY } },
    });
    return parseTeamingEnabled(setting?.value);
  });
}

export async function setTeamingEnabled(
  eventId: string,
  enabled: boolean,
  eventSlug?: string,
): Promise<void> {
  await prisma.appSetting.upsert({
    where: { eventId_key: { eventId, key: TEAMING_ENABLED_KEY } },
    create: { eventId, key: TEAMING_ENABLED_KEY, value: String(enabled) },
    update: { value: String(enabled) },
  });
  await invalidateEventCaches(eventId, eventSlug);
}
