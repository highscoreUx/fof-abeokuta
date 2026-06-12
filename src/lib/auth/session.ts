import { CACHE_TTL, cacheGetOrSet, cacheDelete } from "@/lib/cache/index";
import { prisma } from "@/lib/prisma";
import {
  normalizeRolePermissions,
  permissionsFingerprint,
  type Permission,
} from "@/lib/permissions/catalog";
import { PERMISSIONS_CATALOG_REVISION } from "@/lib/permissions/catalog";
import { resolveAccountPermissionList } from "@/lib/account-permissions";

export interface SessionAuthContext {
  userId: string;
  accountId: string;
  permissions: Permission[];
  authVersion: number;
  accountPermissionsVersion: number;
  permissionsFingerprint: string;
  teamId: string | null;
  eventId: string;
}

async function loadSessionAuthContextFromDb(userId: string): Promise<SessionAuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { account: true },
  });

  if (!user?.account) return null;

  const permissions = resolveAccountPermissionList(user.account);

  return {
    userId: user.id,
    accountId: user.account.id,
    permissions,
    authVersion: user.authVersion,
    accountPermissionsVersion: user.account.permissionsVersion,
    permissionsFingerprint: permissionsFingerprint(
      normalizeRolePermissions(user.account.permissions),
    ),
    teamId: user.teamId,
    eventId: user.eventId,
  };
}

export async function loadSessionAuthContext(userId: string): Promise<SessionAuthContext | null> {
  return cacheGetOrSet(`session:ctx:${userId}`, CACHE_TTL.session, () =>
    loadSessionAuthContextFromDb(userId),
  );
}

export async function invalidateSessionAuthContext(userId: string) {
  await cacheDelete(`session:ctx:${userId}`);
}

export function assertSessionVersions(
  token: {
    authVersion: number;
    accountPermissionsVersion: number;
    permissionsFingerprint: string;
  },
  live: SessionAuthContext,
): "ok" | "stale" {
  if (
    token.authVersion !== live.authVersion ||
    token.accountPermissionsVersion !== live.accountPermissionsVersion ||
    token.permissionsFingerprint !== live.permissionsFingerprint
  ) {
    return "stale";
  }
  return "ok";
}

export { PERMISSIONS_CATALOG_REVISION };
