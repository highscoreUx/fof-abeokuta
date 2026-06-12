import { notFound } from "next/navigation";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { NotRegisteredView } from "@/_views/not-registered/NotRegisteredView";
import { getEventBySlug } from "@/lib/events";

export default async function EventNotRegisteredPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getEventBySlug(eventSlug);
  if (!event) notFound();

  return (
    <EventScopeProvider eventSlug={event.slug} pathPrefix={`/${event.slug}`}>
      <NotRegisteredView eventTitle={event.title} />
    </EventScopeProvider>
  );
}
