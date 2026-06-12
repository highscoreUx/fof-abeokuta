import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { ActivityConfigureView } from "@/_views/admin/activities/ActivityConfigureView";

export default async function ActivityConfigurePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <ActivityConfigureView />
    </EventScopeProvider>
  );
}
