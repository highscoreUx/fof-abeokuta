"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";
import { loginPath } from "@/lib/routes";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

export default function PlatformAccessDeniedPage() {
  const router = useRouter();
  const clearAuth = usePlatformAuthStore((s) => s.clearAuth);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
    router.push(loginPath());
  };

  return (
    <LoginPageLayout slides={[...DEFAULT_LOGIN_SLIDE_PATHS]}>
      <LoginCard
        title="Access denied"
        subtitle="Your account is signed in but does not have platform admin permission."
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ask a platform administrator to grant the{" "}
            <span className="font-mono text-foreground">platform.admin</span> permission on your
            account.
          </p>
          <div className="flex flex-col gap-2">
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
