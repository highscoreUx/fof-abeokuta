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
  setAuth: (accessToken: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}));
