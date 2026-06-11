import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { StreamingView } from "@/_views/admin/streaming/StreamingView";

export default async function AdminStreamingPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <StreamingView />
    </EventScopeProvider>
  );
}
