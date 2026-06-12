"use client";

import { Suspense } from "react";
import { EventLandingPage } from "@/components/landing/EventLandingPage";
import type { LandingPagePayload } from "@/lib/landing-page";
import type { PlatformEvent } from "@/types";

interface LandingViewProps {
  event: PlatformEvent;
  initialLandingPage: LandingPagePayload | null;
  isLatest?: boolean;
}

function LandingViewContent({ event, initialLandingPage, isLatest }: LandingViewProps) {
  return (
    <EventLandingPage
      event={event}
      initialLandingPage={initialLandingPage}
      isLatest={isLatest}
    />
  );
}

export function LandingView({ event, initialLandingPage, isLatest = false }: LandingViewProps) {
  return (
    <Suspense fallback={null}>
      <LandingViewContent
        event={event}
        initialLandingPage={initialLandingPage}
        isLatest={isLatest}
      />
    </Suspense>
  );
}
