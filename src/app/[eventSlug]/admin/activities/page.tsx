import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { ActivitiesView } from "@/_views/admin/activities/ActivitiesView";

export default async function AdminActivitiesPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <ActivitiesView />
    </EventScopeProvider>
  );
}
