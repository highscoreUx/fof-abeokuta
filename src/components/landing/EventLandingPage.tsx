"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EventLanding } from "@/components/event/EventLanding";
import { GrapesEditor } from "@/components/landing/grapes/GrapesEditor";
import { GrapesViewer } from "@/components/landing/grapes/GrapesViewer";
import { Button } from "@/components/ui/button";
import { useCanEditLanding } from "@/hooks/useCanEditLanding";
import { loginPath } from "@/lib/routes";
import type { LandingPagePayload } from "@/lib/landing-page";
import type { PlatformEvent } from "@/types";

interface EventLandingPageProps {
  event: PlatformEvent;
  initialLandingPage: LandingPagePayload | null;
  isLatest?: boolean;
}

export function EventLandingPage({
  event,
  initialLandingPage,
  isLatest = false,
}: EventLandingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEdit, isHydrated } = useCanEditLanding();
  const editParam = searchParams.get("edit") === "1";
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isHydrated && canEdit && editParam) {
      setEditMode(true);
    }
  }, [isHydrated, canEdit, editParam]);

  const hasCustomPage = Boolean(initialLandingPage);
  const showEditor = isHydrated && canEdit && editMode;

  const enterEditor = () => {
    setEditMode(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", "1");
    router.replace(`/${event.slug}?${params.toString()}`, { scroll: false });
  };

  const exitEditor = () => {
    setEditMode(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const query = params.toString();
    router.replace(query ? `/${event.slug}?${query}` : `/${event.slug}`, { scroll: false });
    router.refresh();
  };

  if (showEditor) {
    return (
      <GrapesEditor event={event} initialPage={initialLandingPage} onExit={exitEditor} />
    );
  }

  if (hasCustomPage && initialLandingPage) {
    return (
      <>
        {canEdit && (
          <div className="fixed bottom-6 right-6 z-30">
            <Button type="button" onClick={enterEditor}>
              Customize landing page
            </Button>
          </div>
        )}
        <GrapesViewer html={initialLandingPage.html} css={initialLandingPage.css} />
      </>
    );
  }

  return (
    <>
      {canEdit && (
        <div className="fixed bottom-6 right-6 z-30">
          <Button type="button" onClick={enterEditor}>
            Customize landing page
          </Button>
        </div>
      )}
      <EventLanding event={event} loginHref={loginPath()} isCurrent={isLatest} />
    </>
  );
}
