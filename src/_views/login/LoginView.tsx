"use client";

import { EventLoginForm } from "@/components/auth/EventLoginForm";
import { useEventSlug } from "@/hooks/useEventSlug";

export function LoginView() {
  const eventSlug = useEventSlug();
  return <EventLoginForm eventSlug={eventSlug} />;
}
