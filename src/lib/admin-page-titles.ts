/** Default admin shell titles from the current pathname. */
export function resolveAdminPageTitle(pathname: string): string {
  if (pathname.includes("/admin/activities/")) {
    return "Configure activity";
  }
  if (pathname.endsWith("/admin/users")) {
    return "User Management";
  }
  if (pathname.endsWith("/admin/activities") || pathname.endsWith("/admin/games")) {
    return "Activities";
  }
  if (pathname.endsWith("/admin/agenda")) {
    return "Agenda";
  }
  if (pathname.endsWith("/admin/settings")) {
    return "Event settings";
  }
  if (pathname.endsWith("/admin/customize")) {
    return "Customize";
  }
  if (pathname.endsWith("/admin/quiz")) {
    return "Quiz Admin";
  }
  if (pathname.endsWith("/admin/voting")) {
    return "Voting Admin";
  }
  if (pathname.endsWith("/admin/streaming")) {
    return "Streaming";
  }
  if (pathname.endsWith("/admin")) {
    return "Dashboard";
  }
  return "Admin";
}
