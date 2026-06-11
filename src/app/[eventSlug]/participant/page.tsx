import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <ParticipantView />
    </EventScopeProvider>
  );
}
