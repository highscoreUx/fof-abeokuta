import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { DiagnosticsView } from "@/_views/admin/diagnostics/DiagnosticsView";

export default async function AdminDiagnosticsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <DiagnosticsView />
    </EventScopeProvider>
  );
}
