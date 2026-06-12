import { redirect } from "next/navigation";
import { EventSessionGate } from "@/components/auth/EventSessionGate";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { getLatestEvent } from "@/lib/events";

export async function LatestEventScope({ children }: { children: React.ReactNode }) {
  const event = await getLatestEvent();
  if (!event) redirect("/login");

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix="">
      <EventSessionGate>{children}</EventSessionGate>
    </EventScopeProvider>
  );
}
