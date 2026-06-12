import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { createEventWithDefaults } from "@/lib/events";
import { jsonError } from "@/lib/auth/middleware";
import { createEventAdminUser, serializePlatformCreatedUser } from "@/lib/users";

const createEventSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    date: z.string().min(1),
    status: z.enum(["DRAFT", "LIVE", "ARCHIVED"]).optional(),
    adminFirstName: z.string().min(1).optional(),
    adminLastName: z.string().min(1).optional(),
  })
  .refine(
    (data) =>
      (!data.adminFirstName && !data.adminLastName) ||
      (Boolean(data.adminFirstName) && Boolean(data.adminLastName)),
    { message: "Both admin first and last name are required", path: ["adminFirstName"] },
  );

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
      coverImageUrl: e.coverImageUrl,
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

  let adminUser: ReturnType<typeof serializePlatformCreatedUser> | undefined;
  if (parsed.data.adminFirstName && parsed.data.adminLastName) {
    try {
      const user = await createEventAdminUser(event.id, {
        firstName: parsed.data.adminFirstName,
        lastName: parsed.data.adminLastName,
      });
      adminUser = serializePlatformCreatedUser(user);
    } catch (error) {
      await prisma.event.delete({ where: { id: event.id } }).catch(() => undefined);
      return jsonError(
        error instanceof Error ? error.message : "Failed to create event admin",
        "CREATE_FAILED",
        400,
      );
    }
  }

  return NextResponse.json({
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      date: event.date.toISOString(),
      status: event.status,
      coverImageUrl: event.coverImageUrl,
    },
    adminUser,
    loginPath: adminUser ? `/${event.slug}/login` : undefined,
  });
}
