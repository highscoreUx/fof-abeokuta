"use client";

import { useEventSlug } from "@/hooks/useEventSlug";
import { EventLoginForm } from "@/components/auth/EventLoginForm";

export default function EventLoginPage() {
  const eventSlug = useEventSlug();
  return <EventLoginForm eventSlug={eventSlug} />;
}
