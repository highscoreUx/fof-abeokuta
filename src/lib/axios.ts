"use client";

import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { refreshSessionFromServer } from "@/lib/auth/refresh-client";
import { useAuthStore } from "@/stores/authStore";

export const SESSION_REFRESH_PATH = "/api/auth/refresh";

export const publicApi = axios.create({
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const privateApi = axios.create({
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  failedQueue = [];
}

export async function refreshAccessToken(): Promise<boolean> {
  return refreshSessionFromServer();
}

privateApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

privateApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes(SESSION_REFRESH_PATH)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (!token) return Promise.reject(error);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return privateApi(originalRequest);
        })
        .catch((queueError) => Promise.reject(queueError));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        processQueue(error, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }

      const token = useAuthStore.getState().accessToken;
      processQueue(null, token);
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return privateApi(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function axiosRequest<T>(
  config: AxiosRequestConfig,
  options: { skipAuth?: boolean } = {},
): Promise<T> {
  const client = options.skipAuth ? publicApi : privateApi;
  const response = await client.request<T>(config);
  return response.data;
}
