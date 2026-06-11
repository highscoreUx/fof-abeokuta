import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { GamesView } from "@/_views/admin/games/GamesView";

export default async function AdminGamesPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <GamesView />
    </EventScopeProvider>
  );
}
