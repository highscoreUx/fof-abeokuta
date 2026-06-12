import {
  LANDING_PAGE_SETTING_KEY,
  LEGACY_LANDING_PAGE_SETTING_KEY,
  parseLandingPagePayload,
  type LandingPagePayload,
} from "@/lib/landing-page";
import { prisma } from "@/lib/prisma";

export async function getEventLandingPage(eventId: string): Promise<LandingPagePayload | null> {
  const setting = await prisma.appSetting.findUnique({
    where: { eventId_key: { eventId, key: LANDING_PAGE_SETTING_KEY } },
  });
  const payload = parseLandingPagePayload(setting?.value ?? null);
  if (payload) return payload;

  const legacy = await prisma.appSetting.findUnique({
    where: { eventId_key: { eventId, key: LEGACY_LANDING_PAGE_SETTING_KEY } },
  });
  if (legacy?.value) return null;
  return null;
}

export async function saveEventLandingPage(
  eventId: string,
  data: Pick<LandingPagePayload, "projectData" | "html" | "css">,
) {
  const { serializeLandingPagePayload } = await import("@/lib/landing-page");
  const value = serializeLandingPagePayload(data);
  await prisma.appSetting.upsert({
    where: { eventId_key: { eventId, key: LANDING_PAGE_SETTING_KEY } },
    create: { eventId, key: LANDING_PAGE_SETTING_KEY, value },
    update: { value },
  });
}