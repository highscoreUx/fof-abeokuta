import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(["DRAFT", "LIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      status: parsed.data.status,
    },
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
