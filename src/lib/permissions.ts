import type { Role } from "@/types";

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 4,
  STAFF: 3,
  JUDGE: 2,
  PARTICIPANT: 1,
};

export function hasMinimumRole(userRole: Role, required: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

export function canViewPassword(viewerRole: Role, targetRole: Role, passwordDisplay?: string | null) {
  if (!passwordDisplay) return false;
  if (viewerRole === "ADMIN") return true;
  if (viewerRole === "STAFF" && targetRole !== "ADMIN") return true;
  return false;
}

/** @deprecated use canViewPassword */
export const canViewPin = canViewPassword;

export function slugifyFirstName(firstName: string): string {
  const slug = firstName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
  return slug || "user";
}

export function getPinRangeForRole(role: Role): { min: number; max: number } {
  switch (role) {
    case "ADMIN":
      return { min: 0, max: 999 };
    case "STAFF":
      return { min: 1000, max: 1999 };
    case "JUDGE":
      return { min: 2000, max: 2999 };
    case "PARTICIPANT":
      return { min: 3000, max: 3999 };
  }
}

export function isPinInRoleRange(pin: number, role: Role): boolean {
  const range = getPinRangeForRole(role);
  return pin >= range.min && pin <= range.max;
}

export function formatUsername(
  firstName: string,
  lastName: string,
  middleName?: string | null,
): string {
  const parts = [firstName, lastName, middleName].filter(Boolean);
  return parts
    .join(".")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
}

export function formatEmail(username: string): string {
  return `${username}@event.local`;
}

export function getDefaultRouteForRole(role: Role, pathPrefix: string): string {
  switch (role) {
    case "ADMIN":
      return `${pathPrefix}/admin`;
    case "STAFF":
      return `${pathPrefix}/staff/check-in`;
    case "JUDGE":
      return `${pathPrefix}/judge/scoring`;
    case "PARTICIPANT":
      return `${pathPrefix}/participant`;
  }
}
