"use client";

import { create } from "zustand";

export interface PlatformAdminUser {
  id: string;
  email: string;
  name: string;
}

interface PlatformAuthState {
  accessToken: string | null;
  admin: PlatformAdminUser | null;
  setAuth: (accessToken: string, admin: PlatformAdminUser) => void;
  clearAuth: () => void;
}

export const usePlatformAuthStore = create<PlatformAuthState>((set) => ({
  accessToken: null,
  admin: null,
  setAuth: (accessToken, admin) => set({ accessToken, admin }),
  clearAuth: () => set({ accessToken: null, admin: null }),
}));
