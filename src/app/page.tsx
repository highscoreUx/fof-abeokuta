import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { LandingView } from "@/_views/landing/LandingView";
import { getLatestEvent } from "@/lib/events";
import { getEventLandingPage } from "@/lib/landing-page-server";
import { serializePlatformEvent } from "@/lib/serialize-event";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const event = await getLatestEvent();
  if (!event) redirect("/login");

  const landingPage = await getEventLandingPage(event.id);

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix="">
      <LandingView event={serializePlatformEvent(event)} initialLandingPage={landingPage} isLatest />
    </EventScopeProvider>
  );
}
