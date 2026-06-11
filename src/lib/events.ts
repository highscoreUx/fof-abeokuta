import slugify from "slugify";
import { prisma } from "@/lib/prisma";

const TEAM_DATA = [
  { letter: "F", name: "Team F", color: "#F24E1E" },
  { letter: "I", name: "Team I", color: "#A259FF" },
  { letter: "G", name: "Team G", color: "#0ACF83" },
  { letter: "M", name: "Team M", color: "#1ABCFE" },
  { letter: "A", name: "Team A", color: "#FF7262" },
];

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
      teams: { create: TEAM_DATA },
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
