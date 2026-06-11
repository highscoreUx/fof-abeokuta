import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { AgendaView } from "@/_views/admin/agenda/AgendaView";

export default async function AdminAgendaPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <AgendaView />
    </EventScopeProvider>
  );
}
