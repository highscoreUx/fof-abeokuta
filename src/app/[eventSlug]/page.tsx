import { notFound } from "next/navigation";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { LandingView } from "@/_views/landing/LandingView";
import { getPublicEventBySlug } from "@/lib/events";
import { serializePlatformEvent } from "@/lib/serialize-event";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getPublicEventBySlug(eventSlug);
  if (!event) notFound();

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix={`/${event.slug}`}>
      <LandingView event={serializePlatformEvent(event)} />
    </EventScopeProvider>
  );
}
