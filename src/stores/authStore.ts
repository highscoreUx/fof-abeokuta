"use client";

import { create } from "zustand";
import type { Permission, RolePermission } from "@/lib/permissions/catalog";
import type { AuthUser } from "@/types";

/** Stable fallback for useSyncExternalStore selectors (never use inline `?? []`). */
export const EMPTY_PERMISSIONS: Permission[] = [];

export const selectUserPermissions = (state: AuthState): Permission[] =>
  state.user?.permissions ?? EMPTY_PERMISSIONS;

export interface AccountSession {
  id: string;
  email: string;
  username: string;
  permissions: RolePermission[];
  mustChangePassword?: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  account: AccountSession | null;
  guestEventSlug: string | null;
  isHydrated: boolean;
  isHydrating: boolean;
  setEventAuth: (accessToken: string, user: AuthUser) => void;
  setAccountAuth: (accessToken: string, account: AccountSession) => void;
  setGuestEventAuth: (accessToken: string, account: AccountSession, eventSlug: string) => void;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string | null) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  account: null,
  guestEventSlug: null,
  isHydrated: false,
  isHydrating: false,

  setEventAuth: (accessToken, user) =>
    set({
      accessToken,
      user,
      account: null,
      guestEventSlug: null,
      isHydrated: true,
    }),

  setAccountAuth: (accessToken, account) =>
    set({
      accessToken,
      user: null,
      account,
      guestEventSlug: null,
      isHydrated: true,
    }),

  setGuestEventAuth: (accessToken, account, eventSlug) =>
    set({
      accessToken,
      user: null,
      account,
      guestEventSlug: eventSlug,
      isHydrated: true,
    }),

  setAuth: (accessToken, user) => get().setEventAuth(accessToken, user),

  setAccessToken: (accessToken) => set({ accessToken }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      account: null,
      guestEventSlug: null,
      isHydrated: true,
    }),

  hydrate: async () => {
    const state = get();
    if (state.isHydrated || state.isHydrating) return;

    set({ isHydrating: true });

    try {
      if (state.accessToken && (state.user || state.account || state.guestEventSlug)) {
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
