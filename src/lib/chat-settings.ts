import { CACHE_TTL, cacheGetOrSet } from "@/lib/cache/index";
import { invalidateEventCaches } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/prisma";

export const TEAM_CHAT_ENABLED_KEY = "team_chat_enabled";

export function parseTeamChatEnabled(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  return value !== "false";
}

export async function isTeamChatEnabled(eventId: string): Promise<boolean> {
  return cacheGetOrSet(`event:id:${eventId}:team-chat`, CACHE_TTL.settings, async () => {
    const setting = await prisma.appSetting.findUnique({
      where: { eventId_key: { eventId, key: TEAM_CHAT_ENABLED_KEY } },
    });
    return parseTeamChatEnabled(setting?.value);
  });
}

export async function setTeamChatEnabled(
  eventId: string,
  enabled: boolean,
  eventSlug?: string,
): Promise<void> {
  await prisma.appSetting.upsert({
    where: { eventId_key: { eventId, key: TEAM_CHAT_ENABLED_KEY } },
    create: { eventId, key: TEAM_CHAT_ENABLED_KEY, value: String(enabled) },
    update: { value: String(enabled) },
  });
  await invalidateEventCaches(eventId, eventSlug);
}
