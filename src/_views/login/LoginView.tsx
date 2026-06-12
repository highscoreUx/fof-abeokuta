"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { useOptionalEventScope } from "@/contexts/EventScopeContext";
import { useAuthStore } from "@/stores/authStore";

export function LoginView() {
  const router = useRouter();
  const scope = useOptionalEventScope();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const guestEventSlug = useAuthStore((s) => s.guestEventSlug);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    if (user) {
      const prefix = user.eventSlug ? `/${user.eventSlug}` : scope?.pathPrefix ?? "";
      router.replace(`${prefix}/home`);
      return;
    }
    if (guestEventSlug) {
      router.replace(`/${guestEventSlug}/not-registered`);
      return;
    }
    router.replace("/home");
  }, [accessToken, guestEventSlug, isHydrated, router, scope?.pathPrefix, user]);

  if (isHydrated && accessToken) {
    return null;
  }

  return <LoginForm eventSlug={scope?.eventSlug} pathPrefix={scope?.pathPrefix ?? ""} />;
}
