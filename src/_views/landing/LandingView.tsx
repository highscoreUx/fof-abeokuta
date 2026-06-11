"use client";

import { EventLanding } from "@/components/event/EventLanding";
import { useEventPathPrefix } from "@/hooks/useEventSlug";
import { loginPath } from "@/lib/routes";
import type { PlatformEvent } from "@/types";

interface LandingViewProps {
  event: PlatformEvent;
  isLatest?: boolean;
}

export function LandingView({ event, isLatest = false }: LandingViewProps) {
  const pathPrefix = useEventPathPrefix();
  return (
    <EventLanding event={event} loginHref={loginPath(pathPrefix)} isCurrent={isLatest} />
  );
}
