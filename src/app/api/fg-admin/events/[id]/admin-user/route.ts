import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { jsonError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { createEventAdminUser, serializePlatformCreatedUser } from "@/lib/users";

const schema = z.object({
  email: z.string().email("Valid email is required"),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
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
    const { user, initialPassword, permissionProfile } = await createEventAdminUser(
      event.id,
      parsed.data,
    );
    return NextResponse.json(
      {
        user: serializePlatformCreatedUser(user, initialPassword, permissionProfile),
        loginPath: "/login",
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create event admin",
      "CREATE_FAILED",
      400,
    );
  }
}
