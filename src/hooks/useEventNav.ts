"use client";

import { useMemo } from "react";
import { useEventScope } from "@/contexts/EventScopeContext";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";
import { hasPermission } from "@/lib/permissions";
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
      navIf("dashboard.view", `${prefix}/admin`, "Dashboard", permissions),
      navIf("user.list", `${prefix}/admin/users`, "Users", permissions),
      hasPermission(permissions, "quiz.manage") || hasPermission(permissions, "spin.manage")
        ? { href: `${prefix}/admin/games`, label: "Games & Activities" }
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
        navIf("participant.home", `${prefix}/participant`, "Home", permissions),
        navIf("participant.activities", `${prefix}/participant/activities`, "Activities", permissions),
        navIf("stage.view", `${prefix}/stage`, "Main Stage", permissions),
      ].filter(Boolean) as NavItem[],
    [permissions, prefix],
  );

  return {
    slug,
    pathPrefix,
    admin: `${prefix}/admin`,
    users: `${prefix}/admin/users`,
    games: `${prefix}/admin/games`,
    agenda: `${prefix}/admin/agenda`,
    customize: `${prefix}/admin/customize`,
    settings: `${prefix}/admin/settings`,
    stage: `${prefix}/stage`,
    participant: `${prefix}/participant`,
    participantActivities: `${prefix}/participant/activities`,
    staffCheckIn: `${prefix}/staff/check-in`,
    judgeScoring: `${prefix}/judge/scoring`,
    login: loginPath(pathPrefix),
    nav,
    staffNav,
    judgeNav,
    participantNav,
  };
}
