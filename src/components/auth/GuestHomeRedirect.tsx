"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export function GuestHomeRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const guestEventSlug = useAuthStore((s) => s.guestEventSlug);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated || !guestEventSlug) return;
    router.replace(`/${guestEventSlug}/not-registered`);
  }, [guestEventSlug, isHydrated, router]);

  if (!isHydrated || guestEventSlug) {
    return null;
  }

  return <>{children}</>;
}
