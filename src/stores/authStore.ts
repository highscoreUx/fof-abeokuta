"use client";

import { create } from "zustand";
import type { Permission } from "@/lib/permissions/catalog";
import type { AuthUser } from "@/types";

/** Stable fallback for useSyncExternalStore selectors (never use inline `?? []`). */
export const EMPTY_PERMISSIONS: Permission[] = [];

export const selectUserPermissions = (state: AuthState): Permission[] =>
  state.user?.permissions ?? EMPTY_PERMISSIONS;

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  isHydrating: boolean;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string | null) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isHydrated: false,
  isHydrating: false,

  setAuth: (accessToken, user) =>
    set({
      accessToken,
      user,
      isHydrated: true,
    }),

  setAccessToken: (accessToken) => set({ accessToken }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      isHydrated: true,
    }),

  hydrate: async () => {
    const state = get();
    if (state.isHydrated || state.isHydrating) return;

    set({ isHydrating: true });

    try {
      if (state.accessToken && state.user) {
        set({ isHydrated: true });
        return;
      }

      const { refreshAccessToken } = await import("@/lib/axios");
      await refreshAccessToken();
    } finally {
      set({ isHydrated: true, isHydrating: false });
    }
  },
}));
