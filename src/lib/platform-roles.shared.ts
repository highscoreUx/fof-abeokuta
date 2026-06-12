import {
  isNonDeletableRoleSlug,
  isNonEditableRoleSlug,
} from "@/lib/permissions/default-bundles";

export type { PlatformRoleRow } from "@/lib/platform-roles.types";

export function roleIsDeletable(role: { slug: string; isSystem: boolean }) {
  return !role.isSystem && !isNonDeletableRoleSlug(role.slug);
}

export function roleIsEditable(role: { slug: string }) {
  return !isNonEditableRoleSlug(role.slug);
}

export function slugFromRoleName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return base || "custom_role";
}
