import { CACHE_TTL, cacheGetOrSet } from "@/lib/cache/index";
import { invalidateEventCaches } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/prisma";

export const CHAT_SOCIAL_GAMES_ENABLED_KEY = "chat_social_games_enabled";
export const CHAT_SOCIAL_GAMES_DM_ENABLED_KEY = "chat_social_games_dm_enabled";
export const CHAT_SOCIAL_GAMES_TEAM_ENABLED_KEY = "chat_social_games_team_enabled";

export interface ChatSocialGamesSettings {
  enabled: boolean;
  dmEnabled: boolean;
  teamEnabled: boolean;
}

function parseBool(value: string | undefined | null, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  return value !== "false";
}

export async function getChatSocialGamesSettings(eventId: string): Promise<ChatSocialGamesSettings> {
  return cacheGetOrSet(`event:id:${eventId}:chat-social-games`, CACHE_TTL.settings, async () => {
    const settings = await prisma.appSetting.findMany({
      where: {
        eventId,
        key: {
          in: [
            CHAT_SOCIAL_GAMES_ENABLED_KEY,
            CHAT_SOCIAL_GAMES_DM_ENABLED_KEY,
            CHAT_SOCIAL_GAMES_TEAM_ENABLED_KEY,
          ],
        },
      },
    });
    const map = Object.fromEntries(settings.map((row) => [row.key, row.value]));
    const enabled = parseBool(map[CHAT_SOCIAL_GAMES_ENABLED_KEY], true);
    return {
      enabled,
      dmEnabled: enabled && parseBool(map[CHAT_SOCIAL_GAMES_DM_ENABLED_KEY], true),
      teamEnabled: enabled && parseBool(map[CHAT_SOCIAL_GAMES_TEAM_ENABLED_KEY], true),
    };
  });
}

export async function setChatSocialGamesSettings(
  eventId: string,
  patch: Partial<ChatSocialGamesSettings>,
  eventSlug?: string,
): Promise<void> {
  const entries: Array<[string, boolean]> = [];
  if (patch.enabled !== undefined) entries.push([CHAT_SOCIAL_GAMES_ENABLED_KEY, patch.enabled]);
  if (patch.dmEnabled !== undefined) {
    entries.push([CHAT_SOCIAL_GAMES_DM_ENABLED_KEY, patch.dmEnabled]);
  }
  if (patch.teamEnabled !== undefined) {
    entries.push([CHAT_SOCIAL_GAMES_TEAM_ENABLED_KEY, patch.teamEnabled]);
  }

  for (const [key, value] of entries) {
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId, key } },
      create: { eventId, key, value: String(value) },
      update: { value: String(value) },
    });
  }

  await invalidateEventCaches(eventId, eventSlug);
}

export async function assertChatSocialGameAllowed(
  eventId: string,
  channel: "DM" | "TEAM" | "GENERAL" | "STAFF",
): Promise<void> {
  const settings = await getChatSocialGamesSettings(eventId);
  if (!settings.enabled) {
    throw new Error("Casual chat games are disabled for this event.");
  }
  if (channel === "DM" && !settings.dmEnabled) {
    throw new Error("Direct message games are disabled for this event.");
  }
  if (
    (channel === "TEAM" || channel === "GENERAL" || channel === "STAFF") &&
    !settings.teamEnabled
  ) {
    throw new Error("Group chat games are disabled for this event.");
  }
}
