import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { LoginView } from "@/_views/login/LoginView";

export default async function EventLoginPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <LoginView />
    </EventScopeProvider>
  );
}
