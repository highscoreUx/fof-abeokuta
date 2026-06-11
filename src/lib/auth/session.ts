import { prisma } from "@/lib/prisma";
import {
  permissionsFingerprint,
  type Permission,
} from "@/lib/permissions/catalog";
import { PERMISSIONS_CATALOG_REVISION } from "@/lib/permissions/catalog";
import { resolvePermissionsFromRole } from "@/lib/event-user-roles";

export interface SessionAuthContext {
  userId: string;
  eventUserRoleId: string;
  eventUserRoleSlug: string;
  eventUserRoleName: string;
  permissions: Permission[];
  authVersion: number;
  permissionsVersion: number;
  rolePermissionsVersion: number;
  permissionsFingerprint: string;
  teamId: string | null;
  eventId: string;
}

export async function loadSessionAuthContext(userId: string): Promise<SessionAuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      eventUserRole: true,
      event: { select: { permissionsVersion: true } },
    },
  });

  if (!user?.eventUserRole) return null;

  const permissions = resolvePermissionsFromRole(user.eventUserRole);

  return {
    userId: user.id,
    eventUserRoleId: user.eventUserRole.id,
    eventUserRoleSlug: user.eventUserRole.slug,
    eventUserRoleName: user.eventUserRole.name,
    permissions,
    authVersion: user.authVersion,
    permissionsVersion: user.event.permissionsVersion,
    rolePermissionsVersion: user.eventUserRole.permissionsVersion,
    permissionsFingerprint: permissionsFingerprint(permissions),
    teamId: user.teamId,
    eventId: user.eventId,
  };
}

export function assertSessionVersions(
  token: {
    authVersion: number;
    permissionsVersion: number;
    rolePermissionsVersion: number;
    permissionsFingerprint: string;
  },
  live: SessionAuthContext,
): "ok" | "stale" {
  if (
    token.authVersion !== live.authVersion ||
    token.permissionsVersion !== live.permissionsVersion ||
    token.rolePermissionsVersion !== live.rolePermissionsVersion ||
    token.permissionsFingerprint !== live.permissionsFingerprint
  ) {
    return "stale";
  }
  return "ok";
}

export { PERMISSIONS_CATALOG_REVISION };
