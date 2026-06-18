"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventSlug } from "@/hooks/useEventSlug";
import { useChatStore } from "@/stores/chatStore";

export function useChatMentionSeenHydration() {
  const { user } = useAuth();
  const eventSlug = useEventSlug();
  const hydrateSeenMentionIds = useChatStore((state) => state.hydrateSeenMentionIds);

  useEffect(() => {
    if (!user?.id || !eventSlug) return;
    hydrateSeenMentionIds(eventSlug, user.id);
  }, [eventSlug, hydrateSeenMentionIds, user?.id]);
}
