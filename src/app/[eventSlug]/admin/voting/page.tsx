import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { VotingView } from "@/_views/admin/voting/VotingView";

export default async function AdminVotingPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <VotingView />
    </EventScopeProvider>
  );
}
