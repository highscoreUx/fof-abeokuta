"use client";

import { create } from "zustand";
import type { Permission } from "@/lib/permissions/catalog";
import type { AuthUser } from "@/types";

/** Stable fallback for useSyncExternalStore selectors (never use inline `?? []`). */
export const EMPTY_PERMISSIONS: Permission[] = [];

export const selectUserPermissions = (state: AuthState): Permission[] =>
  state.user?.permissions ?? state.account?.permissions ?? EMPTY_PERMISSIONS;

export interface AccountSession {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  permissions: Permission[];
  mustChangePassword?: boolean;
}

interface AuthState {
  accessToken: string | null;
  account: AccountSession | null;
  user: AuthUser | null;
  isHydrated: boolean;
  isHydrating: boolean;
  setAccountAuth: (accessToken: string, account: AccountSession) => void;
  setEventUser: (user: AuthUser | null) => void;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string | null) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  account: null,
  user: null,
  isHydrated: false,
  isHydrating: false,

  setAccountAuth: (accessToken, account) =>
    set({
      accessToken,
      account,
      isHydrated: true,
    }),

  setEventUser: (user) => set({ user }),

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
      account: null,
      user: null,
      isHydrated: true,
    }),

  hydrate: async () => {
    const state = get();
    if (state.isHydrated || state.isHydrating) return;

    set({ isHydrating: true });

    try {
      if (state.accessToken && state.account) {
        set({ isHydrated: true });
        return;
      }

      const { refreshSessionFromServer } = await import("@/lib/auth/refresh-client");
      await refreshSessionFromServer();
    } finally {
      set({ isHydrated: true, isHydrating: false });
    }
  },
}));
