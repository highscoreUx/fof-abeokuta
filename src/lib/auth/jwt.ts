import jwt from "jsonwebtoken";
import type { AccessTokenPayload, Role } from "@/types";

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

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "event" }, getAccessSecret(), { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string, eventId: string): string {
  return jwt.sign({ userId, eventId, type: "event" }, getRefreshSecret(), { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getAccessSecret());
  if (
    typeof decoded === "string" ||
    decoded.type !== "event" ||
    !decoded.userId ||
    !decoded.role ||
    !decoded.eventId ||
    !decoded.eventSlug
  ) {
    throw new Error("Invalid access token");
  }
  return {
    userId: decoded.userId as string,
    role: decoded.role as Role,
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
