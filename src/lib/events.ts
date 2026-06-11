import slugify from "slugify";
import { FIGMA_TEAMS } from "@/lib/figma-teams";
import { prisma } from "@/lib/prisma";

export { RESERVED_EVENT_SLUGS } from "@/lib/reserved-slugs";

const CRITERIA = [
  { name: "Innovation", maxPoints: 25, sortOrder: 1 },
  { name: "Design Quality", maxPoints: 25, sortOrder: 2 },
  { name: "Feasibility", maxPoints: 25, sortOrder: 3 },
  { name: "Presentation", maxPoints: 25, sortOrder: 4 },
];

export function slugifyEventTitle(title: string): string {
  return slugify(title, { lower: true, strict: true });
}

export async function getEventBySlug(slug: string) {
  return prisma.event.findUnique({ where: { slug } });
}

export async function requireEventBySlug(slug: string) {
  const event = await getEventBySlug(slug);
  if (!event) throw new Error("Event not found");
  return event;
}

const publicEventSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  date: true,
  status: true,
} as const;

/** Most recent event by date — shown at `/` and `/login` (any status). */
export async function getLatestEvent() {
  return prisma.event.findFirst({
    orderBy: { date: "desc" },
    select: publicEventSelect,
  });
}

/** @deprecated Use getLatestEvent */
export const getCurrentEvent = getLatestEvent;

export async function getPublicEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    select: publicEventSelect,
  });
}

export async function createEventWithDefaults(data: {
  title: string;
  description?: string;
  date: Date;
  status?: "DRAFT" | "LIVE" | "ARCHIVED";
}) {
  const baseSlug = slugifyEventTitle(data.title);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return prisma.event.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      status: data.status ?? "DRAFT",
      teams: { create: [...FIGMA_TEAMS] },
      scoreCriteria: { create: CRITERIA },
      sponsors: {
        create: [
          {
            label: "Organised by Friends of Figma Abeokuta",
            position: "BOTTOM_RIGHT",
            visibleOnPublicOnly: false,
          },
          {
            label: "Sponsored by Figma, JekaCode",
            position: "BOTTOM_LEFT",
            visibleOnPublicOnly: true,
          },
        ],
      },
      appSettings: {
        create: [
          { key: "youtube_video_id", value: "" },
          { key: "stream_live", value: "false" },
        ],
      },
    },
    include: { teams: true },
  });
}
