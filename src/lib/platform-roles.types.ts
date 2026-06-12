import type { RolePermission } from "@/lib/permissions/catalog";

export type PlatformRoleRow = {
  id: string;
  slug: string;
  name: string;
  permissions: RolePermission[];
  permissionsVersion: number;
  isSystem: boolean;
};
