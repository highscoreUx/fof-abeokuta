import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { StageView } from "@/_views/stage/StageView";

export default async function StagePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <StageView />
    </EventScopeProvider>
  );
}
