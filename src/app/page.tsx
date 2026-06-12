import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { LandingView } from "@/_views/landing/LandingView";
import { getLatestEvent } from "@/lib/events";
import { serializePlatformEvent } from "@/lib/serialize-event";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const event = await getLatestEvent();
  if (!event) redirect("/login");

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix="">
      <LandingView event={serializePlatformEvent(event)} isLatest />
    </EventScopeProvider>
  );
}
