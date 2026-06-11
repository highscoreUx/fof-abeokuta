import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { CustomizeView } from "@/_views/admin/customize/CustomizeView";

export default async function AdminCustomizePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <CustomizeView />
    </EventScopeProvider>
  );
}
