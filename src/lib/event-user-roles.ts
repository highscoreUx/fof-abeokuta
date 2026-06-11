import { prisma } from "@/lib/prisma";
import { slugifyEventUserRoleName } from "@/lib/event-user-role-slug";
import {
  ALL_PERMISSIONS,
  normalizeRolePermissions,
  type Permission,
  type RolePermission,
} from "@/lib/permissions/catalog";
import {
  DEFAULT_EVENT_USER_ROLE_BUNDLES,
  isNonDeletableRoleSlug,
  isNonEditableRoleSlug,
  LEGACY_ROLE_TO_SLUG,
  type SystemEventUserRoleSlug,
} from "@/lib/permissions/default-bundles";

export { slugifyEventUserRoleName };

export function validateRolePermissions(permissions: RolePermission[]): void {
  for (const p of permissions) {
    if (p === "*") continue;
    if (!(ALL_PERMISSIONS as readonly string[]).includes(p)) {
      throw new Error(`Invalid permission: ${p}`);
    }
  }
}

export async function seedDefaultEventUserRoles(eventId: string) {
  for (const bundle of DEFAULT_EVENT_USER_ROLE_BUNDLES) {
    await prisma.eventUserRole.upsert({
      where: { eventId_slug: { eventId, slug: bundle.slug } },
      update: {
        name: bundle.name,
        permissions: bundle.permissions,
        isSystem: bundle.isSystem,
      },
      create: {
        eventId,
        slug: bundle.slug,
        name: bundle.name,
        permissions: bundle.permissions,
        isSystem: bundle.isSystem,
      },
    });
  }
}

export async function getEventUserRoleBySlug(eventId: string, slug: string) {
  return prisma.eventUserRole.findUnique({
    where: { eventId_slug: { eventId, slug } },
  });
}

export async function getEventUserRoleIdForLegacyRole(
  eventId: string,
  legacyRole: string,
): Promise<string> {
  const slug = LEGACY_ROLE_TO_SLUG[legacyRole] ?? "participant";
  const role = await getEventUserRoleBySlug(eventId, slug);
  if (!role) throw new Error(`Missing event user role: ${slug}`);
  return role.id;
}

export function resolvePermissionsFromRole(role: {
  permissions: unknown;
}): Permission[] {
  const normalized = normalizeRolePermissions(role.permissions);
  if (normalized.includes("*")) {
    return [...ALL_PERMISSIONS];
  }
  return normalized as Permission[];
}

export async function bumpUsersAuthVersionForRole(eventUserRoleId: string) {
  await prisma.user.updateMany({
    where: { eventUserRoleId },
    data: { authVersion: { increment: 1 } },
  });
}

export async function listEventUserRoles(eventId: string) {
  return prisma.eventUserRole.findMany({
    where: { eventId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export function serializeEventUserRole(role: {
  id: string;
  eventId: string;
  name: string;
  slug: string;
  permissions: unknown;
  permissionsVersion: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const permissions = normalizeRolePermissions(role.permissions);
  return {
    id: role.id,
    eventId: role.eventId,
    name: role.name,
    slug: role.slug,
    permissions,
    permissionsVersion: role.permissionsVersion,
    isSystem: role.isSystem,
    isEditable: !isNonEditableRoleSlug(role.slug),
    isDeletable: !isNonDeletableRoleSlug(role.slug) && !role.isSystem,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

export function assertRoleSlugAvailable(
  slug: string,
  existingSlug?: string,
): void {
  if (slug !== existingSlug && isSystemRoleSlugReserved(slug)) {
    throw new Error("Reserved access profile slug");
  }
}

function isSystemRoleSlugReserved(slug: string): boolean {
  return (DEFAULT_EVENT_USER_ROLE_BUNDLES as Array<{ slug: string }>).some(
    (bundle) => bundle.slug === slug,
  );
}

export { isNonDeletableRoleSlug, isNonEditableRoleSlug, type SystemEventUserRoleSlug };
