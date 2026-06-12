"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { canAccessPlatform } from "@/lib/account-permissions";
import {
  permissionsFromAccount,
  resolvePostLoginRedirect,
} from "@/lib/post-login-redirect";
import { inferEventSlugFromPath, isPlatformPath } from "@/lib/route-access";
import { useAuthStore, type AccountSession } from "@/stores/authStore";
import type { AuthUser } from "@/types";

type LoginResponse =
  | {
      mustChangePassword: true;
      accountAccessToken: string;
      account: AccountSession;
    }
  | {
      mustChangePassword?: false;
      accessToken: string;
      user?: AuthUser;
      account?: AccountSession;
    };

interface UseLoginOptions {
  eventSlug?: string;
  pathPrefix?: string;
}

export function useLogin({ eventSlug, pathPrefix = "" }: UseLoginOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const setEventAuth = useAuthStore((s) => s.setEventAuth);
  const setAccountAuth = useAuthStore((s) => s.setAccountAuth);

  const login = useCallback(
    async (email: string, password: string) => {
      const targetNext = next ?? `${pathPrefix}/home`;
      const platformIntent = isPlatformPath(targetNext);
      const slugFromNext = inferEventSlugFromPath(targetNext);
      const resolvedEventSlug = platformIntent ? undefined : (slugFromNext ?? eventSlug);

      if (!platformIntent && !resolvedEventSlug) {
        throw new Error(
          "No event is available. Open an event link first, or add ?next=/fg-admin for platform access.",
        );
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(resolvedEventSlug ? { eventSlug: resolvedEventSlug } : {}),
        }),
      });

      const data = (await response.json()) as LoginResponse & { error?: string };

      if (response.status === 403 && platformIntent) {
        router.push("/fg-admin/access-denied");
        return;
      }

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

      if ("user" in data && data.user) {
        setEventAuth(data.accessToken, data.user);
        const userPrefix = data.user.eventSlug ? `/${data.user.eventSlug}` : pathPrefix;
        router.push(
          resolvePostLoginRedirect({
            next,
            permissions: data.user.permissions,
            eventSlug: data.user.eventSlug,
            pathPrefix: userPrefix,
            isPlatformSession: false,
          }),
        );
        return;
      }

      if ("account" in data && data.account) {
        const permissions = permissionsFromAccount(data.account);
        if (!canAccessPlatform(permissions)) {
          router.push("/fg-admin/access-denied");
          return;
        }
        setAccountAuth(data.accessToken, data.account);
        router.push(
          resolvePostLoginRedirect({
            next,
            permissions,
            isPlatformSession: true,
          }),
        );
        return;
      }

      throw new Error("Login failed");
    },
    [eventSlug, next, pathPrefix, router, setAccountAuth, setEventAuth],
  );

  return { login, next };
}
