export const FG_ADMIN_ROOT = "/fg-admin";
export const FG_ADMIN_EVENTS = "/fg-admin/events";
export const FG_ADMIN_MEMBERS = "/fg-admin/members";

export function fgAdminEventPath(eventSlug: string, query?: string) {
  return `${FG_ADMIN_EVENTS}/${eventSlug}${query ? `?${query}` : ""}`;
}

export function fgAdminMembersPath(options?: { eventSlug?: string; view?: "staff" }) {
  const params = new URLSearchParams();
  if (options?.eventSlug) params.set("event", options.eventSlug);
  if (options?.view === "staff") params.set("view", "staff");
  const query = params.toString();
  return `${FG_ADMIN_MEMBERS}${query ? `?${query}` : ""}`;
}
