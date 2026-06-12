"use client";

import { usePlatformAuthStore } from "@/stores/platformAuthStore";
import type { PlatformAdminUser } from "@/stores/platformAuthStore";

export async function platformApiFetch<T>(path: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = options;
  const token = usePlatformAuthStore.getState().accessToken;

  const response = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
  });

  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshPlatformAccessToken();
    if (refreshed) return platformApiFetch<T>(path, options);
    usePlatformAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") window.location.href = "/fg-admin/login";
    throw new Error("Session expired");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export async function platformApiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = usePlatformAuthStore.getState().accessToken;

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
    usePlatformAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") window.location.href = "/fg-admin/login";
    throw new Error("Session expired");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Upload failed");
  return data as T;
}

export async function refreshPlatformAccessToken(): Promise<boolean> {
  try {
    const response = await fetch("/api/fg-admin/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { accessToken: string; admin: PlatformAdminUser };
    usePlatformAuthStore.getState().setAuth(data.accessToken, data.admin);
    return true;
  } catch {
    return false;
  }
}
