import type { PlatformCreatedEventUser } from "@/types";

const STORAGE_KEY = "fof_platform_created_credentials";

export interface FlashedCredentials {
  eventTitle: string;
  loginPath: string;
  user: PlatformCreatedEventUser;
  emailQueued: boolean;
}

export function flashPlatformCredentials(payload: FlashedCredentials) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumePlatformCredentials(): FlashedCredentials | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as FlashedCredentials;
  } catch {
    return null;
  }
}
