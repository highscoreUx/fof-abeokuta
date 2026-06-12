"use client";

import { useEffect, useState } from "react";
import { useLogin } from "@/hooks/useLogin";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LOGIN_SLIDE_PATHS, resolveLoginSlides } from "@/lib/login-slides";

interface LoginFormProps {
  eventSlug?: string;
  pathPrefix?: string;
}

export function LoginForm({ eventSlug }: LoginFormProps) {
  const { login } = useLogin();
  const [slides, setSlides] = useState<string[]>([...DEFAULT_LOGIN_SLIDE_PATHS]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventSlug) return;
    fetch(`/api/events/${eventSlug}/login-slides`)
      .then((response) => response.json())
      .then((data: { slides?: string[] }) => {
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(resolveLoginSlides(data.slides));
        }
      })
      .catch(() => {
        /* keep defaults */
      });
  }, [eventSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <LoginPageLayout slides={slides}>
      <LoginCard title="Sign in" subtitle="Use your email and password to continue.">
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
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || loading}>
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </LoginCard>
    </LoginPageLayout>
  );
}
