import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import {
  bumpUsersAuthVersionForRole,
  isNonDeletableRoleSlug,
  isNonEditableRoleSlug,
  serializeEventUserRole,
  validateRolePermissions,
} from "@/lib/event-user-roles";
import { normalizeRolePermissions, type RolePermission } from "@/lib/permissions/catalog";
import { updateEventUserRoleSchema } from "@/lib/validators/event-user-roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "event_user_role.update");
  if (ctx instanceof NextResponse) return ctx;

  const role = await prisma.eventUserRole.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!role) {
    return NextResponse.json({ error: "Access profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateEventUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const data: {
    name?: string;
    permissions?: RolePermission[];
    permissionsVersion?: { increment: number };
  } = {};

  if (parsed.data.name !== undefined) {
    if (isNonEditableRoleSlug(role.slug) && role.isSystem) {
      return NextResponse.json(
        { error: "This access profile name cannot be changed" },
        { status: 403 },
      );
    }
    data.name = parsed.data.name.trim();
  }

  if (parsed.data.fullAccess !== undefined || parsed.data.permissions !== undefined) {
    if (isNonEditableRoleSlug(role.slug)) {
      return NextResponse.json(
        { error: "This access profile permissions cannot be changed" },
        { status: 403 },
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

    data.permissions = permissions;
    data.permissionsVersion = { increment: 1 };
  }

  const updated = await prisma.eventUserRole.update({
    where: { id: role.id },
    data,
  });

  if (data.permissionsVersion) {
    await bumpUsersAuthVersionForRole(role.id);
  }

  return NextResponse.json({ role: serializeEventUserRole(updated) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "event_user_role.delete");
  if (ctx instanceof NextResponse) return ctx;

  const role = await prisma.eventUserRole.findFirst({
    where: { id, eventId: ctx.event.id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) {
    return NextResponse.json({ error: "Access profile not found" }, { status: 404 });
  }

  if (isNonDeletableRoleSlug(role.slug) || role.isSystem) {
    return NextResponse.json({ error: "This access profile cannot be deleted" }, { status: 403 });
  }

  if (role._count.users > 0) {
    return NextResponse.json(
      { error: "Reassign users before deleting this access profile" },
      { status: 409 },
    );
  }

  await prisma.eventUserRole.delete({ where: { id: role.id } });
  return NextResponse.json({ ok: true });
}
