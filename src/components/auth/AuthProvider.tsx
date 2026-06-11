"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { refreshAccessToken } from "@/lib/api-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const params = useParams();
  const eventSlug = typeof params?.eventSlug === "string" ? params.eventSlug : null;

  useEffect(() => {
    if (!accessToken && eventSlug) {
      void refreshAccessToken(eventSlug);
    }
  }, [accessToken, eventSlug]);

  return <>{children}</>;
}
