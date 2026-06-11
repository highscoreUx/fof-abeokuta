import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { UsersView } from "@/_views/admin/users/UsersView";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <UsersView />
    </EventScopeProvider>
  );
}
