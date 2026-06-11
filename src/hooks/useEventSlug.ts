"use client";

import { useParams } from "next/navigation";

export function useEventSlug(): string {
  const params = useParams();
  const slug = params?.eventSlug;
  if (typeof slug !== "string") {
    throw new Error("Event slug not found in route");
  }
  return slug;
}
