"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { resolveAuthenticatedLoginRedirect } from "@/lib/post-login-redirect";
import { useAuthStore } from "@/stores/authStore";

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const account = useAuthStore((s) => s.account);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated || !accessToken || !account) return;
    router.replace(
      resolveAuthenticatedLoginRedirect({
        next: searchParams.get("next"),
        account,
      }),
    );
  }, [accessToken, account, isHydrated, router, searchParams]);

  if (isHydrated && accessToken && account) {
    return null;
  }

  return <LoginForm />;
}
