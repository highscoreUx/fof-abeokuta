"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { useOptionalEventScope } from "@/contexts/EventScopeContext";

export function LoginView() {
  const scope = useOptionalEventScope();
  return <LoginForm eventSlug={scope?.eventSlug} pathPrefix={scope?.pathPrefix ?? ""} />;
}
