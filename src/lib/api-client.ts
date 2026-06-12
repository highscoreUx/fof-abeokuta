"use client";

import type { AxiosRequestConfig } from "axios";
import { axiosRequest, refreshAccessToken } from "@/lib/axios";
import { getLoginRedirectFromPathname } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

interface FetchOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
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
  const { skipAuth = false, body, headers, method = "GET" } = options;

  const config: AxiosRequestConfig = {
    url: eventApiPath(eventSlug, path),
    method,
    headers,
    data: body ? JSON.parse(body) : undefined,
  };

  try {
    return await axiosRequest<T>(config, { skipAuth });
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 401 && !skipAuth) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        const target = getLoginRedirectFromPathname(
          window.location.pathname,
          window.location.search,
        );
        window.location.href = target;
        return new Promise(() => {}) as Promise<T>;
      }
      return new Promise(() => {}) as Promise<T>;
    }

    const message =
      (error as { response?: { data?: { error?: string } } }).response?.data?.error ??
      (error instanceof Error ? error.message : "Request failed");
    throw new Error(message);
  }
}

export { refreshAccessToken };
