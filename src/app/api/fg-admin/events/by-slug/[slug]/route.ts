import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { jsonError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authResult = requirePlatformAuth(_request);
  if (authResult instanceof NextResponse) return authResult;

  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { _count: { select: { users: true } } },
  });

  if (!event) {
    return jsonError("Event not found", "NOT_FOUND", 404);
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
      userCount: event._count.users,
    },
  });
}
