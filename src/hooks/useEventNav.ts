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
    quiz: `${prefix}/admin/quiz`,
    voting: `${prefix}/admin/voting`,
    activities: `${prefix}/admin/activities`,
    stage: `${prefix}/stage`,
    participant: `${prefix}/participant`,
    participantActivities: `${prefix}/participant/activities`,
    staffCheckIn: `${prefix}/staff/check-in`,
    judgeScoring: `${prefix}/judge/scoring`,
    login: loginPath(pathPrefix),
    nav: [
      { href: `${prefix}/admin`, label: "Dashboard" },
      { href: `${prefix}/admin/users`, label: "Users" },
      { href: `${prefix}/admin/quiz`, label: "Quiz" },
      { href: `${prefix}/admin/voting`, label: "Voting" },
      { href: `${prefix}/admin/activities`, label: "Activities" },
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
