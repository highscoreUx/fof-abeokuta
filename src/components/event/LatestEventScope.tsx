import { notFound } from "next/navigation";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { getLatestEvent } from "@/lib/events";

export async function LatestEventScope({ children }: { children: React.ReactNode }) {
  const event = await getLatestEvent();
  if (!event) notFound();

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix="">
      {children}
    </EventScopeProvider>
  );
}
