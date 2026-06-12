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

export function signRefreshToken(payload: {
  accountId: string;
  userId?: string;
  eventId?: string;
  eventSlug?: string;
}): string {
  return jwt.sign({ ...payload, type: "session" }, getRefreshSecret(), { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getAccessSecret());
  if (typeof decoded === "string" || decoded.type !== "event") {
    throw new Error("Invalid access token");
  }

  const permissions = decoded.permissions;
  if (
    !decoded.userId ||
    !decoded.accountId ||
    !decoded.eventId ||
    !decoded.eventSlug ||
    !Array.isArray(permissions) ||
    typeof decoded.authVersion !== "number" ||
    typeof decoded.accountPermissionsVersion !== "number" ||
    typeof decoded.permissionsFingerprint !== "string" ||
    !Array.isArray(decoded.enabledActivities)
  ) {
    throw new Error("Invalid access token");
  }

  return {
    userId: decoded.userId as string,
    accountId: decoded.accountId as string,
    permissions: permissions as Permission[],
    authVersion: decoded.authVersion as number,
    accountPermissionsVersion: decoded.accountPermissionsVersion as number,
    permissionsFingerprint: decoded.permissionsFingerprint as string,
    teamId: (decoded.teamId as string | null | undefined) ?? null,
    eventId: decoded.eventId as string,
    eventSlug: decoded.eventSlug as string,
    enabledActivities: decoded.enabledActivities as AccessTokenPayload["enabledActivities"],
    type: "event",
  };
}

export function verifyRefreshToken(token: string): {
  accountId: string;
  userId?: string;
  eventId?: string;
  eventSlug?: string;
} {
  const decoded = jwt.verify(token, getRefreshSecret());
  if (typeof decoded === "string" || decoded.type !== "session" || !decoded.accountId) {
    throw new Error("Invalid refresh token");
  }
  return {
    accountId: decoded.accountId as string,
    userId: decoded.userId as string | undefined,
    eventId: decoded.eventId as string | undefined,
    eventSlug: decoded.eventSlug as string | undefined,
  };
}
