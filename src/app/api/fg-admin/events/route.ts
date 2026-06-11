import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { createEventWithDefaults } from "@/lib/events";
import { jsonError } from "@/lib/auth/middleware";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().min(1),
  status: z.enum(["DRAFT", "LIVE", "ARCHIVED"]).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description,
      date: e.date.toISOString(),
      status: e.status,
      userCount: e._count.users,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  const event = await createEventWithDefaults({
    title: parsed.data.title,
    description: parsed.data.description,
    date: new Date(parsed.data.date),
    status: parsed.data.status,
  });

  return NextResponse.json({
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      date: event.date.toISOString(),
      status: event.status,
    },
  });
}
