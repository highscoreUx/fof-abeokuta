"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";
import { toastError } from "@/lib/toast";

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toastError("Missing session", "Sign in again.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to change password");
      const next = searchParams.get("next");
      router.push(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    } catch (err) {
      toastError(
        "Failed to change password",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginPageLayout slides={[...DEFAULT_LOGIN_SLIDE_PATHS]}>
      <LoginCard
        title="Set your password"
        subtitle="Choose a strong password before continuing."
      >
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
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-foreground">
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
            {loading ? "Saving…" : "Save password"}
          </Button>
        </form>
      </LoginCard>
    </LoginPageLayout>
  );
}
