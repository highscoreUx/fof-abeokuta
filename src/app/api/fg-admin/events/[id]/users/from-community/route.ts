import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addCommunityMembersToEvent } from "@/lib/community-event-participants";
import { jsonError } from "@/lib/auth/middleware";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  accountIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  try {
    const users = await addCommunityMembersToEvent(event.id, parsed.data.accountIds);
    return NextResponse.json({ users, added: users.length }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to add participants",
      "CREATE_FAILED",
      400,
    );
  }
}
