import { cacheDelete, cacheDeletePattern } from "@/lib/cache/index";

export async function invalidateEventBySlug(slug: string) {
  await cacheDelete(`event:slug:${slug}`);
}

export async function invalidateEventCaches(eventId: string, slug?: string) {
  await cacheDelete(`event:id:${eventId}:activities`);
  await cacheDelete(`event:id:${eventId}:team-chat`);
  await cacheDelete(`event:id:${eventId}:teaming`);
  await cacheDeletePattern(`leaderboard:${eventId}:`);
  if (slug) await invalidateEventBySlug(slug);
}

export async function invalidateSessionUser(userId: string) {
  await cacheDelete(`session:ctx:${userId}`);
}
