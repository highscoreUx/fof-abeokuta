export const FG_ADMIN_ROOT = "/fg-admin";
export const FG_ADMIN_EVENTS = "/fg-admin/events";
export const FG_ADMIN_MEMBERS = "/fg-admin/members";

export function fgAdminEventPath(eventSlug: string, query?: string) {
  return `${FG_ADMIN_EVENTS}/${eventSlug}${query ? `?${query}` : ""}`;
}

export function fgAdminMembersPath(options?: { view?: "staff" }) {
  if (options?.view === "staff") {
    return `${FG_ADMIN_MEMBERS}?view=staff`;
  }
  return FG_ADMIN_MEMBERS;
}
