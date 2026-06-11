"use client";

import { useMemo } from "react";
import { useEventScope } from "@/contexts/EventScopeContext";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";
import { hasAdminShellAccess, hasPermission } from "@/lib/permissions";
import { loginPath } from "@/lib/routes";
import type { Permission } from "@/lib/permissions/catalog";

interface NavItem {
  href: string;
  label: string;
}

function navIf(permission: Permission, href: string, label: string, permissions: Permission[]): NavItem | null {
  return hasPermission(permissions, permission) ? { href, label } : null;
}

export function useEventNav() {
  const { eventSlug: slug, pathPrefix } = useEventScope();
  const prefix = pathPrefix;
  const permissions = useAuthStore(selectUserPermissions);

  const nav = useMemo(() => {
    const items = [
      hasAdminShellAccess(permissions)
        ? { href: `${prefix}/home`, label: "Home" }
        : null,
      navIf("user.list", `${prefix}/admin/users`, "Users", permissions),
      hasPermission(permissions, "quiz.manage") || hasPermission(permissions, "spin.manage")
        ? { href: `${prefix}/admin/activities`, label: "Activities" }
        : null,
      navIf("agenda.list", `${prefix}/admin/agenda`, "Agenda", permissions),
      navIf("customize.branding", `${prefix}/admin/customize`, "Customize", permissions),
      hasPermission(permissions, "team.list") ||
      hasPermission(permissions, "vote.list") ||
      hasPermission(permissions, "settings.broadcasting") ||
      hasPermission(permissions, "settings.diagnostics") ||
      hasPermission(permissions, "event_user_role.list")
        ? { href: `${prefix}/admin/settings`, label: "Event settings" }
        : null,
    ].filter(Boolean) as NavItem[];
    return items;
  }, [permissions, prefix]);

  const staffNav = useMemo(
    () =>
      [
        navIf("participant.home", `${prefix}/home`, "Home", permissions),
        navIf("user.check_in", `${prefix}/staff/check-in`, "Check In", permissions),
        navIf("stage.view", `${prefix}/stage`, "Main Stage", permissions),
      ].filter(Boolean) as NavItem[],
    [permissions, prefix],
  );

  const judgeNav = useMemo(
    () =>
      [
        navIf("score.submit", `${prefix}/judge/scoring`, "Scoring", permissions),
        navIf("stage.view", `${prefix}/stage`, "Main Stage", permissions),
      ].filter(Boolean) as NavItem[],
    [permissions, prefix],
  );

  const participantNav = useMemo(
    () =>
      [
        navIf("participant.home", `${prefix}/home`, "Home", permissions),
        navIf("participant.activities", `${prefix}/home/activities`, "Activities", permissions),
        navIf("stage.view", `${prefix}/stage`, "Main Stage", permissions),
      ].filter(Boolean) as NavItem[],
    [permissions, prefix],
  );

  return {
    slug,
    pathPrefix,
    admin: `${prefix}/admin`,
    users: `${prefix}/admin/users`,
    activities: `${prefix}/admin/activities`,
    /** @deprecated use activities */
    games: `${prefix}/admin/activities`,
    agenda: `${prefix}/admin/agenda`,
    customize: `${prefix}/admin/customize`,
    settings: `${prefix}/admin/settings`,
    stage: `${prefix}/stage`,
    home: `${prefix}/home`,
    homeActivities: `${prefix}/home/activities`,
    /** @deprecated use home */
    participant: `${prefix}/home`,
    /** @deprecated use homeActivities */
    participantActivities: `${prefix}/home/activities`,
    staffCheckIn: `${prefix}/staff/check-in`,
    judgeScoring: `${prefix}/judge/scoring`,
    login: loginPath(pathPrefix),
    nav,
    staffNav,
    judgeNav,
    participantNav,
  };
}
