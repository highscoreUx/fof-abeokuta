import { Suspense } from "react";
import { EventSessionGate } from "@/components/auth/EventSessionGate";
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
      <EventSessionGate>
        <Suspense fallback={null}>
          <ParticipantView />
        </Suspense>
      </EventSessionGate>
    </EventScopeProvider>
  );
}
