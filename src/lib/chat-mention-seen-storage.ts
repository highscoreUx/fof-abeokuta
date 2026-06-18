export function seenMentionsStorageKey(eventSlug: string, userId: string) {
  return `fof:chat:seen-mentions:${eventSlug}:${userId}`;
}

export function readSeenMentionIdsByRoom(
  eventSlug: string,
  userId: string,
): Record<string, string[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(seenMentionsStorageKey(eventSlug, userId));
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const result: Record<string, string[]> = {};
    for (const [roomId, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(ids)) {
        result[roomId] = ids.filter((id): id is string => typeof id === "string");
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function writeSeenMentionIdsByRoom(
  eventSlug: string,
  userId: string,
  data: Record<string, string[]>,
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(seenMentionsStorageKey(eventSlug, userId), JSON.stringify(data));
  } catch {
    // ignore quota / private browsing
  }
}
