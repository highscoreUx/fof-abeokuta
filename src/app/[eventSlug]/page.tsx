import { notFound } from "next/navigation";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { LandingView } from "@/_views/landing/LandingView";
import { getPublicEventBySlug } from "@/lib/events";
import { getEventLandingPage } from "@/lib/landing-page-server";
import { serializePlatformEvent } from "@/lib/serialize-event";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getPublicEventBySlug(eventSlug);
  if (!event) notFound();

  const landingPage = await getEventLandingPage(event.id);

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix={`/${event.slug}`}>
      <LandingView event={serializePlatformEvent(event)} initialLandingPage={landingPage} />
    </EventScopeProvider>
  );
}
