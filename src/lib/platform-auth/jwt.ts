import jwt from "jsonwebtoken";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

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

export interface PlatformAccessPayload {
  adminId: string;
  email: string;
  type: "platform";
}

export function signPlatformAccessToken(payload: Omit<PlatformAccessPayload, "type">): string {
  return jwt.sign({ ...payload, type: "platform" }, getAccessSecret(), { expiresIn: ACCESS_TTL });
}

export function signPlatformRefreshToken(adminId: string): string {
  return jwt.sign({ adminId, type: "platform" }, getRefreshSecret(), { expiresIn: REFRESH_TTL });
}

export function verifyPlatformAccessToken(token: string): PlatformAccessPayload {
  const decoded = jwt.verify(token, getAccessSecret());
  if (typeof decoded === "string" || decoded.type !== "platform" || !decoded.adminId) {
    throw new Error("Invalid platform access token");
  }
  return {
    adminId: decoded.adminId as string,
    email: decoded.email as string,
    type: "platform",
  };
}

export function verifyPlatformRefreshToken(token: string): { adminId: string } {
  const decoded = jwt.verify(token, getRefreshSecret());
  if (typeof decoded === "string" || decoded.type !== "platform" || !decoded.adminId) {
    throw new Error("Invalid platform refresh token");
  }
  return { adminId: decoded.adminId as string };
}
