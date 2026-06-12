"use client";

import { EventLanding } from "@/components/event/EventLanding";
import { loginPath } from "@/lib/routes";
import type { PlatformEvent } from "@/types";

interface LandingViewProps {
  event: PlatformEvent;
  isLatest?: boolean;
}

export function LandingView({ event, isLatest = false }: LandingViewProps) {
  return (
    <EventLanding event={event} loginHref={loginPath()} isCurrent={isLatest} />
  );
}
