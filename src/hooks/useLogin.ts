"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  permissionsFromAccount,
  resolvePostLoginRedirect,
} from "@/lib/post-login-redirect";
import { useAuthStore, type AccountSession } from "@/stores/authStore";

type LoginResponse =
  | {
      mustChangePassword: true;
      accountAccessToken: string;
      account: AccountSession;
    }
  | {
      mustChangePassword?: false;
      accessToken: string;
      account: AccountSession;
    };

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const setAccountAuth = useAuthStore((s) => s.setAccountAuth);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await response.json()) as LoginResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if ("mustChangePassword" in data && data.mustChangePassword) {
        const changeUrl = new URL("/change-password", window.location.origin);
        changeUrl.searchParams.set("token", data.accountAccessToken);
        if (next) changeUrl.searchParams.set("next", next);
        router.push(`${changeUrl.pathname}${changeUrl.search}`);
        return;
      }

      if ("account" in data && data.account) {
        const permissions = permissionsFromAccount(data.account);
        setAccountAuth(data.accessToken, data.account);
        router.push(
          resolvePostLoginRedirect({
            next,
            permissions,
            isPlatformSession: false,
          }),
        );
        return;
      }

      throw new Error("Login failed");
    },
    [next, router, setAccountAuth],
  );

  return { login, next };
}
