"use client";

import { useEffect } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventSlug } from "@/hooks/useEventSlug";
import { useChatStore } from "@/stores/chatStore";
import type { ChatRoom } from "@/types/chat";

const FALLBACK_ROOMS: ChatRoom[] = [{ id: "global", category: "general", label: "General" }];
const EMPTY_ROOMS: ChatRoom[] = [];

export function useChatRooms() {
  const { api } = useEventApi();
  const eventSlug = useEventSlug();

  const rooms = useChatStore((state) =>
    state.roomsEventSlug === eventSlug ? state.rooms : EMPTY_ROOMS,
  );
  const roomsLoaded = useChatStore(
    (state) => state.roomsEventSlug === eventSlug && state.roomsLoaded,
  );
  const roomsLoading = useChatStore((state) => state.roomsLoading);
  const setRoomsForEvent = useChatStore((state) => state.setRoomsForEvent);
  const setRoomsLoading = useChatStore((state) => state.setRoomsLoading);
  const resetRoomsForEvent = useChatStore((state) => state.resetRoomsForEvent);

  useEffect(() => {
    resetRoomsForEvent(eventSlug);
  }, [eventSlug, resetRoomsForEvent]);

  useEffect(() => {
    if (roomsLoaded) return;

    let cancelled = false;
    setRoomsLoading(true);

    api<{ rooms: ChatRoom[] }>("/chat/rooms")
      .then((data) => {
        if (cancelled) return;
        setRoomsForEvent(eventSlug, data.rooms);
      })
      .catch(() => {
        if (cancelled) return;
        setRoomsForEvent(eventSlug, FALLBACK_ROOMS);
      });

    return () => {
      cancelled = true;
    };
  }, [api, eventSlug, roomsLoaded, setRoomsForEvent, setRoomsLoading]);

  return {
    rooms,
    roomsLoading: roomsLoading && !roomsLoaded,
    roomsLoaded,
  };
}
