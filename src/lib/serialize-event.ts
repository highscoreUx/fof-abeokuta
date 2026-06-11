import type { PlatformEvent } from "@/types";

type EventWithDate = Omit<PlatformEvent, "date"> & { date: Date };

export function serializePlatformEvent(event: EventWithDate): PlatformEvent {
  return { ...event, date: event.date.toISOString() };
}
