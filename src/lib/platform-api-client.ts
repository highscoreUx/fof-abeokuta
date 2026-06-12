"use client";

import { refreshSessionFromServer } from "@/lib/auth/refresh-client";
import { getLoginRedirectFromPathname } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

export async function platformApiFetch<T>(path: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const response = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
  });

  if (response.status === 403 && !skipAuth) {
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") window.location.href = "/fg-admin/access-denied";
    throw new Error("Forbidden");
  }

  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshPlatformAccessToken();
    if (refreshed) return platformApiFetch<T>(path, options);
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = getLoginRedirectFromPathname(
        window.location.pathname,
        window.location.search,
      );
      return new Promise(() => {}) as Promise<T>;
    }
    return new Promise(() => {}) as Promise<T>;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export async function platformApiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const response = await fetch(path, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: "include",
  });

  if (response.status === 401) {
    const refreshed = await refreshPlatformAccessToken();
    if (refreshed) return platformApiUpload<T>(path, formData);
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = getLoginRedirectFromPathname(
        window.location.pathname,
        window.location.search,
      );
      return new Promise(() => {}) as Promise<T>;
    }
    return new Promise(() => {}) as Promise<T>;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Upload failed");
  return data as T;
}

export async function refreshPlatformAccessToken(): Promise<boolean> {
  return refreshSessionFromServer();
}
