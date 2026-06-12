import { EventSessionGate } from "@/components/auth/EventSessionGate";
import { EventScopeProvider } from "@/contexts/EventScopeContext";
import { AdminShellLayout } from "@/components/layout/AdminShellLayout";

export default async function EventAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return (
    <EventScopeProvider eventSlug={eventSlug} pathPrefix={`/${eventSlug}`}>
      <EventSessionGate>
        <AdminShellLayout>{children}</AdminShellLayout>
      </EventSessionGate>
    </EventScopeProvider>
  );
}
