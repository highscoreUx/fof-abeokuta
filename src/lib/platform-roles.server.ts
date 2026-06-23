import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_EVENT_USER_ROLE_BUNDLES,
} from "@/lib/permissions/default-bundles";
import {
  normalizeRolePermissions,
  permissionsFingerprint,
  type RolePermission,
} from "@/lib/permissions/catalog";
import {
  roleIsDeletable,
  roleIsEditable,
  slugFromRoleName,
} from "@/lib/platform-roles.shared";
import type { PlatformRoleRow } from "@/lib/platform-roles.types";
import { invalidateSessionAuthContext } from "@/lib/auth/session";
import {
  getProfileBySlug,
  getProfileLabelForPermissions,
  setRolePresetCache,
} from "@/lib/role-preset-cache";

export type { PlatformRoleRow } from "@/lib/platform-roles.types";
export { roleIsDeletable, roleIsEditable, slugFromRoleName } from "@/lib/platform-roles.shared";
export {
  getCachedPermissionProfiles,
  getProfileBySlug,
  getProfileLabelForPermissions,
  getProfilePermissions,
} from "@/lib/role-preset-cache";

export async function refreshPermissionProfilesCache() {
  const roles = await prisma.platformRole.findMany({ orderBy: { name: "asc" } });
  const serialized = roles.map(serializePlatformRole);
  setRolePresetCache(serialized);
  return serialized;
}

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

export function getProfileLabelForSlug(slug: string): string {
  return getProfileBySlug(slug)?.name ?? slug;
}

export async function propagateRolePresetPermissions(
  previousPermissions: RolePermission[],
  nextPermissions: RolePermission[],
): Promise<{ accountsUpdated: number; usersUpdated: number }> {
  const previousFingerprint = permissionsFingerprint(previousPermissions);

  const accounts = await prisma.account.findMany({
    select: { id: true, permissions: true },
  });
  const matchingAccountIds = accounts
    .filter(
      (account) =>
        permissionsFingerprint(normalizeRolePermissions(account.permissions)) ===
        previousFingerprint,
    )
    .map((account) => account.id);

  if (matchingAccountIds.length > 0) {
    await prisma.account.updateMany({
      where: { id: { in: matchingAccountIds } },
      data: {
        permissions: nextPermissions,
        permissionsVersion: { increment: 1 },
      },
    });
  }

  const usersWithOverrides = await prisma.user.findMany({
    where: { permissions: { not: Prisma.DbNull } },
    select: { id: true, permissions: true },
  });
  const matchingUserIds = usersWithOverrides
    .filter(
      (user) =>
        permissionsFingerprint(normalizeRolePermissions(user.permissions)) === previousFingerprint,
    )
    .map((user) => user.id);

  if (matchingUserIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: matchingUserIds } },
      data: {
        permissions: nextPermissions,
        authVersion: { increment: 1 },
      },
    });
  }

  const usersToInvalidate = await prisma.user.findMany({
    where: {
      OR: [{ id: { in: matchingUserIds } }, { accountId: { in: matchingAccountIds } }],
    },
    select: { id: true },
  });

  await Promise.all(usersToInvalidate.map((user) => invalidateSessionAuthContext(user.id)));

  return {
    accountsUpdated: matchingAccountIds.length,
    usersUpdated: matchingUserIds.length,
  };
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
  input: { name?: string; permissions?: RolePermission[]; applyToExisting?: boolean },
) {
  const existing = await prisma.platformRole.findUnique({ where: { id } });
  if (!existing) throw new Error("Role not found");
  if (!roleIsEditable(existing)) throw new Error("This role cannot be edited");

  const previousPermissions = normalizeRolePermissions(existing.permissions);
  const permissionsChanged =
    input.permissions !== undefined &&
    permissionsFingerprint(input.permissions) !== permissionsFingerprint(previousPermissions);

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

  let propagation: { accountsUpdated: number; usersUpdated: number } | undefined;
  if (input.applyToExisting && permissionsChanged && input.permissions) {
    propagation = await propagateRolePresetPermissions(previousPermissions, input.permissions);
  }

  return {
    role: serializePlatformRole(role),
    propagation,
  };
}

export async function deletePlatformRole(id: string) {
  const existing = await prisma.platformRole.findUnique({ where: { id } });
  if (!existing) throw new Error("Role not found");
  if (!roleIsDeletable(existing)) throw new Error("This role cannot be deleted");

  await prisma.platformRole.delete({ where: { id } });
  await refreshPermissionProfilesCache();
}
