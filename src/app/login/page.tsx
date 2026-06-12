import { Suspense } from "react";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { LoginView } from "@/_views/login/LoginView";
import { getLatestEvent } from "@/lib/events";

export default async function LoginPage() {
  const event = await getLatestEvent();

  if (!event) {
    return (
      <Suspense fallback={null}>
        <LoginView />
      </Suspense>
    );
  }

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix="">
      <Suspense fallback={null}>
        <LoginView />
      </Suspense>
    </EventScopeProvider>
  );
}
