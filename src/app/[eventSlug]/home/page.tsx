import { Suspense } from "react";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { ParticipantView } from "@/_views/participant/ParticipantView";

export default async function HomePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <Suspense fallback={null}>
        <ParticipantView />
      </Suspense>
    </EventScopeProvider>
  );
}
