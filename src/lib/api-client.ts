"use client";

import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/types";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export function eventApiPath(eventSlug: string, path: string) {
  return `/api/events/${eventSlug}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch<T>(
  eventSlug: string,
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const response = await fetch(eventApiPath(eventSlug, path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
  });

  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken(eventSlug);
    if (refreshed) {
      return apiFetch<T>(eventSlug, path, { ...options, skipAuth: false });
    }
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = `/${eventSlug}/login`;
    }
    throw new Error("Session expired");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

export async function refreshAccessToken(eventSlug: string): Promise<boolean> {
  try {
    const response = await fetch(eventApiPath(eventSlug, "/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) return false;

    const data = (await response.json()) as { accessToken: string; user: AuthUser };
    useAuthStore.getState().setAuth(data.accessToken, data.user);
    return true;
  } catch {
    return false;
  }
}
