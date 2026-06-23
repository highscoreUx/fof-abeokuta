"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";
import { toastError, toastSuccess } from "@/lib/toast";

interface ResetPasswordViewProps {
  token: string;
}

export function ResetPasswordView({ token }: ResetPasswordViewProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(Boolean(token));
  const [valid, setValid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }

    let cancelled = false;
    void fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((data: { valid?: boolean }) => {
        if (!cancelled) setValid(Boolean(data.valid));
      })
      .catch(() => {
        if (!cancelled) setValid(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toastError("Invalid link", "Request a new reset link from the sign-in page.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      toastSuccess("Password updated", "You can sign in with your new password.");
      router.push("/login");
    } catch (err) {
      toastError(
        "Failed to reset password",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <LoginPageLayout slides={[...DEFAULT_LOGIN_SLIDE_PATHS]}>
        <LoginCard title="Reset password" subtitle="Checking your link…">
          <p className="text-sm text-muted-foreground">One moment.</p>
        </LoginCard>
      </LoginPageLayout>
    );
  }

  if (!token || !valid) {
    return (
      <LoginPageLayout slides={[...DEFAULT_LOGIN_SLIDE_PATHS]}>
        <LoginCard
          title="Link expired"
          subtitle="This password reset link is invalid or has already been used."
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Request a new link from the sign-in page. Links expire after one hour.
            </p>
            <Link href="/forgot-password">
              <Button size="lg" className="w-full">
                Request new link
              </Button>
            </Link>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </LoginCard>
      </LoginPageLayout>
    );
  }

  return (
    <LoginPageLayout slides={[...DEFAULT_LOGIN_SLIDE_PATHS]}>
      <LoginCard title="Choose a new password" subtitle="Use at least 12 characters with mixed case and a number.">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-foreground">
              New password
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Update password"}
          </Button>
        </form>
      </LoginCard>
    </LoginPageLayout>
  );
}
