import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { SettingsView } from "@/_views/admin/settings/SettingsView";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <SettingsView />
    </EventScopeProvider>
  );
}
