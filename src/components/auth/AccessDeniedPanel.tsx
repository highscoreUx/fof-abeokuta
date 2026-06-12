"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";
import { loginPath } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

interface AccessDeniedPanelProps {
  context?: "platform" | "event";
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}

export function AccessDeniedPanel({
  context = "event",
  title = "Access denied",
  description,
  homeHref,
  homeLabel = "Go to your home",
}: AccessDeniedPanelProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const defaultDescription =
    context === "platform"
      ? "Your account is signed in but does not have platform admin permission."
      : "You are signed in but do not have permission to view this page.";

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
    router.push(loginPath());
  };

  return (
    <LoginPageLayout slides={[...DEFAULT_LOGIN_SLIDE_PATHS]}>
      <LoginCard title={title} subtitle={description ?? defaultDescription}>
        <div className="space-y-4">
          {context === "platform" && (
            <p className="text-sm text-muted-foreground">
              Ask a platform administrator to grant the{" "}
              <span className="font-mono text-foreground">platform.admin</span> permission on your
              account.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {homeHref && (
              <Button type="button" variant="primary" onClick={() => router.push(homeHref)}>
                {homeLabel}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => void logout()}>
              Sign out
            </Button>
            <Link href="/" className="text-center text-sm text-primary underline">
              Go to event home
            </Link>
          </div>
        </div>
      </LoginCard>
    </LoginPageLayout>
  );
}
