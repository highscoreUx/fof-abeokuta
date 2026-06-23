"use client";

import Link from "next/link";
import { useState } from "react";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";
import { toastError } from "@/lib/toast";

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not send reset email");
      }
      setMessage(
        data.message ??
          "If an account exists with that email, we sent a link to reset your password.",
      );
      setSent(true);
    } catch (err) {
      toastError(
        "Could not send reset email",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginPageLayout slides={[...DEFAULT_LOGIN_SLIDE_PATHS]}>
      <LoginCard
        title="Forgot password?"
        subtitle={
          sent
            ? "Check your email for a reset link."
            : "Enter your email and we will send you a link to reset your password."
        }
      >
        {sent ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link href="/login">
              <Button size="lg" className="w-full" variant="secondary">
                Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || email.trim().length === 0}
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </LoginCard>
    </LoginPageLayout>
  );
}
