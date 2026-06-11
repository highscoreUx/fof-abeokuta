import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import {
  assertRoleSlugAvailable,
  bumpUsersAuthVersionForRole,
  listEventUserRoles,
  serializeEventUserRole,
  slugifyEventUserRoleName,
  validateRolePermissions,
} from "@/lib/event-user-roles";
import { normalizeRolePermissions, type RolePermission } from "@/lib/permissions/catalog";
import { createEventUserRoleSchema } from "@/lib/validators/event-user-roles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "event_user_role.list");
  if (ctx instanceof NextResponse) return ctx;

  const roles = await listEventUserRoles(ctx.event.id);
  return NextResponse.json({ roles: roles.map(serializeEventUserRole) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "event_user_role.create");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createEventUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const roleSlug = parsed.data.slug?.trim()
    ? slugifyEventUserRoleName(parsed.data.slug)
    : slugifyEventUserRoleName(parsed.data.name);

  try {
    assertRoleSlugAvailable(roleSlug);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid slug" },
      { status: 409 },
    );
  }

  const permissions: RolePermission[] = parsed.data.fullAccess
    ? ["*"]
    : normalizeRolePermissions(parsed.data.permissions);

  try {
    validateRolePermissions(permissions);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid permissions" },
      { status: 400 },
    );
  }

  const existing = await prisma.eventUserRole.findUnique({
    where: { eventId_slug: { eventId: ctx.event.id, slug: roleSlug } },
  });
  if (existing) {
    return NextResponse.json({ error: "Access profile slug already exists" }, { status: 409 });
  }

  const created = await prisma.eventUserRole.create({
    data: {
      eventId: ctx.event.id,
      name: parsed.data.name.trim(),
      slug: roleSlug,
      permissions,
      isSystem: false,
    },
  });

  return NextResponse.json({ role: serializeEventUserRole(created) }, { status: 201 });
}
