import { EventSessionGate } from "@/components/auth/EventSessionGate";
import { EventScopeProvider } from "@/contexts/EventScopeContext";

export default async function EventJudgeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <EventSessionGate>{children}</EventSessionGate>
    </EventScopeProvider>
  );
}
