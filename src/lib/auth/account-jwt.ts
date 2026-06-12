import jwt from "jsonwebtoken";
import type { Permission } from "@/lib/permissions/catalog";

const ACCESS_TTL = "15m";

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return secret;
}

export interface AccountAccessPayload {
  accountId: string;
  email: string;
  username: string;
  permissions: Permission[];
  permissionsFingerprint: string;
  accountPermissionsVersion: number;
  mustChangePassword: boolean;
  type: "account";
}

export function signAccountAccessToken(
  payload: Omit<AccountAccessPayload, "type">,
): string {
  return jwt.sign({ ...payload, type: "account" }, getAccessSecret(), { expiresIn: ACCESS_TTL });
}

export function verifyAccountAccessToken(token: string): AccountAccessPayload {
  const decoded = jwt.verify(token, getAccessSecret());
  if (typeof decoded === "string" || decoded.type !== "account" || !decoded.accountId) {
    throw new Error("Invalid account access token");
  }
  return {
    accountId: decoded.accountId as string,
    email: decoded.email as string,
    username: decoded.username as string,
    permissions: Array.isArray(decoded.permissions) ? (decoded.permissions as Permission[]) : [],
    permissionsFingerprint: String(decoded.permissionsFingerprint ?? ""),
    accountPermissionsVersion: Number(decoded.accountPermissionsVersion ?? 0),
    mustChangePassword: Boolean(decoded.mustChangePassword),
    type: "account",
  };
}
