import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EVENT_USER_ROLE_BUNDLES,
} from "@/lib/permissions/default-bundles";
import {
  normalizeRolePermissions,
  type RolePermission,
} from "@/lib/permissions/catalog";
import {
  roleIsDeletable,
  roleIsEditable,
  slugFromRoleName,
} from "@/lib/platform-roles.shared";
import type { PlatformRoleRow } from "@/lib/platform-roles.types";

export type { PlatformRoleRow } from "@/lib/platform-roles.types";
export { roleIsDeletable, roleIsEditable, slugFromRoleName } from "@/lib/platform-roles.shared";

let cachedProfiles: PlatformRoleRow[] | null = null;

export function serializePlatformRole(role: {
  id: string;
  slug: string;
  name: string;
  permissions: unknown;
  permissionsVersion: number;
  isSystem: boolean;
}): PlatformRoleRow {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
    permissions: normalizeRolePermissions(role.permissions),
    permissionsVersion: role.permissionsVersion,
    isSystem: role.isSystem,
  };
}

export async function refreshPermissionProfilesCache() {
  const roles = await prisma.platformRole.findMany({ orderBy: { name: "asc" } });
  cachedProfiles = roles.map(serializePlatformRole);
  return cachedProfiles;
}

export function getCachedPermissionProfiles(): PlatformRoleRow[] {
  return cachedProfiles ?? DEFAULT_EVENT_USER_ROLE_BUNDLES.map((bundle) => ({
    id: bundle.slug,
    slug: bundle.slug,
    name: bundle.name,
    permissions: bundle.permissions,
    permissionsVersion: 0,
    isSystem: bundle.isSystem,
  }));
}

export async function ensurePlatformRolesSeeded() {
  const count = await prisma.platformRole.count();
  if (count > 0) {
    return refreshPermissionProfilesCache();
  }

  const now = new Date();
  await prisma.platformRole.createMany({
    data: DEFAULT_EVENT_USER_ROLE_BUNDLES.map((bundle) => ({
      slug: bundle.slug,
      name: bundle.name,
      permissions: bundle.permissions,
      permissionsVersion: 0,
      isSystem: bundle.isSystem,
      updatedAt: now,
    })),
  });

  return refreshPermissionProfilesCache();
}

export async function listPlatformRoles() {
  await ensurePlatformRolesSeeded();
  return prisma.platformRole.findMany({ orderBy: { name: "asc" } }).then((rows) =>
    rows.map(serializePlatformRole),
  );
}

export function getProfileBySlug(slug: string) {
  return getCachedPermissionProfiles().find((profile) => profile.slug === slug);
}

export function getProfilePermissions(slug: string): RolePermission[] {
  const profile = getProfileBySlug(slug);
  if (!profile) throw new Error(`Unknown permission profile: ${slug}`);
  return profile.permissions;
}

export function getProfileLabelForSlug(slug: string): string {
  return getProfileBySlug(slug)?.name ?? slug;
}

export async function createPlatformRole(input: {
  name: string;
  slug?: string;
  permissions: RolePermission[];
}) {
  const slug = input.slug?.trim() || slugFromRoleName(input.name);
  const existing = await prisma.platformRole.findUnique({ where: { slug } });
  if (existing) throw new Error("A role with this slug already exists");

  const role = await prisma.platformRole.create({
    data: {
      name: input.name.trim(),
      slug,
      permissions: input.permissions,
      isSystem: false,
    },
  });

  await refreshPermissionProfilesCache();
  return serializePlatformRole(role);
}

export async function updatePlatformRole(
  id: string,
  input: { name?: string; permissions?: RolePermission[] },
) {
  const existing = await prisma.platformRole.findUnique({ where: { id } });
  if (!existing) throw new Error("Role not found");
  if (!roleIsEditable(existing)) throw new Error("This role cannot be edited");

  const role = await prisma.platformRole.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.permissions !== undefined
        ? {
            permissions: input.permissions,
            permissionsVersion: { increment: 1 },
          }
        : {}),
    },
  });

  await refreshPermissionProfilesCache();
  return serializePlatformRole(role);
}

export async function deletePlatformRole(id: string) {
  const existing = await prisma.platformRole.findUnique({ where: { id } });
  if (!existing) throw new Error("Role not found");
  if (!roleIsDeletable(existing)) throw new Error("This role cannot be deleted");

  const inUse = await prisma.account.findFirst({
    where: { permissions: { equals: existing.permissions as object } },
  });
  if (inUse) {
    throw new Error("Cannot delete a role that is still assigned to members");
  }

  await prisma.platformRole.delete({ where: { id } });
  await refreshPermissionProfilesCache();
}
