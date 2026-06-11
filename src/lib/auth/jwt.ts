import jwt from "jsonwebtoken";
import type { AccessTokenPayload } from "@/types";
import type { Permission } from "@/lib/permissions/catalog";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "24h";

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return secret;
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not set");
  return secret;
}

export type AccessTokenInput = Omit<AccessTokenPayload, "type">;

export function signAccessToken(payload: AccessTokenInput): string {
  return jwt.sign({ ...payload, type: "event" }, getAccessSecret(), { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string, eventId: string): string {
  return jwt.sign({ userId, eventId, type: "event" }, getRefreshSecret(), { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getAccessSecret());
  if (typeof decoded === "string" || decoded.type !== "event") {
    throw new Error("Invalid access token");
  }

  const permissions = decoded.permissions;
  if (
    !decoded.userId ||
    !decoded.eventId ||
    !decoded.eventSlug ||
    !decoded.eventUserRoleId ||
    !decoded.eventUserRoleSlug ||
    !Array.isArray(permissions) ||
    typeof decoded.authVersion !== "number" ||
    typeof decoded.permissionsVersion !== "number" ||
    typeof decoded.rolePermissionsVersion !== "number" ||
    typeof decoded.permissionsFingerprint !== "string"
  ) {
    throw new Error("Invalid access token");
  }

  return {
    userId: decoded.userId as string,
    permissions: permissions as Permission[],
    eventUserRoleId: decoded.eventUserRoleId as string,
    eventUserRoleSlug: decoded.eventUserRoleSlug as string,
    authVersion: decoded.authVersion as number,
    permissionsVersion: decoded.permissionsVersion as number,
    rolePermissionsVersion: decoded.rolePermissionsVersion as number,
    permissionsFingerprint: decoded.permissionsFingerprint as string,
    teamId: (decoded.teamId as string | null | undefined) ?? null,
    eventId: decoded.eventId as string,
    eventSlug: decoded.eventSlug as string,
    type: "event",
  };
}

export function verifyRefreshToken(token: string): { userId: string; eventId: string } {
  const decoded = jwt.verify(token, getRefreshSecret());
  if (typeof decoded === "string" || decoded.type !== "event" || !decoded.userId || !decoded.eventId) {
    throw new Error("Invalid refresh token");
  }
  return { userId: decoded.userId as string, eventId: decoded.eventId as string };
}
