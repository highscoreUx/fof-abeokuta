"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LOGIN_SLIDE_PATHS, resolveLoginSlides } from "@/lib/login-slides";

interface EventLoginFormProps {
  eventSlug: string;
}

export function EventLoginForm({ eventSlug }: EventLoginFormProps) {
  const { login } = useAuth(eventSlug);
  const [slides, setSlides] = useState<string[]>([...DEFAULT_LOGIN_SLIDE_PATHS]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = username.trim().length >= 3 && password.length === 4;

  return (
    <LoginPageLayout slides={slides}>
      <LoginCard title="Event sign in" subtitle="Use the username and password given to you by staff at check-in.">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-foreground">
              Username
            </label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Given to you at check-in"
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
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •"
              className="font-mono tracking-[0.35em]"
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
