"use client";

import { useEventScope } from "@/contexts/EventScopeContext";
import { loginPath } from "@/lib/routes";

export function useEventNav() {
  const { eventSlug: slug, pathPrefix } = useEventScope();
  const prefix = pathPrefix;

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
    nav: [
      { href: `${prefix}/admin`, label: "Dashboard" },
      { href: `${prefix}/admin/users`, label: "Users" },
      { href: `${prefix}/admin/games`, label: "Games & Activities" },
      { href: `${prefix}/admin/agenda`, label: "Agenda" },
      { href: `${prefix}/admin/customize`, label: "Customize" },
      { href: `${prefix}/admin/settings`, label: "Event settings" },
      { href: `${prefix}/stage`, label: "Main Stage" },
    ],
    staffNav: [
      { href: `${prefix}/staff/check-in`, label: "Check In" },
      { href: `${prefix}/stage`, label: "Main Stage" },
    ],
    judgeNav: [
      { href: `${prefix}/judge/scoring`, label: "Scoring" },
      { href: `${prefix}/stage`, label: "Main Stage" },
    ],
    participantNav: [
      { href: `${prefix}/participant`, label: "Home" },
      { href: `${prefix}/participant/activities`, label: "Activities" },
      { href: `${prefix}/stage`, label: "Main Stage" },
    ],
  };
}
