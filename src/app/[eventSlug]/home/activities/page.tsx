import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { ParticipantActivitiesView } from "@/_views/participant/activities/ParticipantActivitiesView";

export default async function HomeActivitiesPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <ParticipantActivitiesView />
    </EventScopeProvider>
  );
}
