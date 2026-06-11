import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { AdminView } from "@/_views/admin/AdminView";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <AdminView />
    </EventScopeProvider>
  );
}
