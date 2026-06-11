import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { ScoringView } from "@/_views/judge/scoring/ScoringView";

export default async function JudgeScoringPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <ScoringView />
    </EventScopeProvider>
  );
}
