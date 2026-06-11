import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { CheckInView } from "@/_views/staff/check-in/CheckInView";

export default async function StaffCheckInPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <CheckInView />
    </EventScopeProvider>
  );
}
