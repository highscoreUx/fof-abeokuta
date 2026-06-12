import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { createEventWithDefaults } from "@/lib/events";
import { jsonError } from "@/lib/auth/middleware";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import {
  buildPlatformEventsOrderBy,
  buildPlatformEventsWhere,
} from "@/lib/platform-events-query";
import { createEventAdminUser, serializePlatformCreatedUser } from "@/lib/users";

const createEventSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    date: z.string().min(1),
    status: z.enum(["DRAFT", "LIVE", "ARCHIVED"]).optional(),
    adminEmail: z.string().email().optional(),
    adminUsername: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-z0-9_]+$/)
      .optional(),
    adminFirstName: z.string().min(1).optional(),
    adminLastName: z.string().min(1).optional(),
  })
  .refine(
    (data) => {
      const fields = [
        data.adminEmail,
        data.adminUsername,
        data.adminFirstName,
        data.adminLastName,
      ];
      return fields.every(Boolean) || fields.every((value) => !value);
    },
    { message: "All event admin fields are required together", path: ["adminEmail"] },
  );

export async function GET(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const query = parsePaginationParams(searchParams);
  const status = searchParams.get("status") || undefined;
  const where = buildPlatformEventsWhere(query.q, status);

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: buildPlatformEventsOrderBy(query.sortBy, query.sortOrder),
      include: { _count: { select: { users: true } } },
      skip: query.skip,
      take: query.limit,
    }),
    prisma.event.count({ where }),
  ]);

  return NextResponse.json(
    toPaginatedResponse(
      events.map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        description: e.description,
        date: e.date.toISOString(),
        status: e.status,
        coverImageUrl: e.coverImageUrl,
        userCount: e._count.users,
      })),
      total,
      query.page,
      query.limit,
    ),
  );
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
  if (
    parsed.data.adminEmail &&
    parsed.data.adminUsername &&
    parsed.data.adminFirstName &&
    parsed.data.adminLastName
  ) {
    try {
      const { user, initialPassword, permissionProfile } = await createEventAdminUser(event.id, {
        email: parsed.data.adminEmail,
        username: parsed.data.adminUsername,
        firstName: parsed.data.adminFirstName,
        lastName: parsed.data.adminLastName,
      });
      adminUser = serializePlatformCreatedUser(user, initialPassword, permissionProfile);
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
    loginPath: adminUser ? "/login" : undefined,
  });
}
