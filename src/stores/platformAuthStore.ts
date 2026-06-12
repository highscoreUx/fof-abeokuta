"use client";

import { useAuthStore, type AccountSession } from "@/stores/authStore";

export type PlatformAdminUser = AccountSession;

type PlatformAuthSlice = {
  accessToken: string | null;
  admin: AccountSession | null;
  setAuth: (accessToken: string, admin: AccountSession) => void;
  clearAuth: () => void;
};

function toPlatformSlice(state: ReturnType<typeof useAuthStore.getState>): PlatformAuthSlice {
  return {
    accessToken: state.accessToken,
    admin: state.account,
    setAuth: state.setAccountAuth,
    clearAuth: state.clearAuth,
  };
}

export function usePlatformAuthStore<T>(selector: (state: PlatformAuthSlice) => T): T {
  return useAuthStore((state) => selector(toPlatformSlice(state)));
}

usePlatformAuthStore.getState = () => toPlatformSlice(useAuthStore.getState());
