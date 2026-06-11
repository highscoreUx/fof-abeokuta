"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventSlug } from "@/hooks/useEventSlug";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LOGIN_SLIDE_PATHS, resolveLoginSlides } from "@/lib/login-slides";

export default function EventLoginPage() {
  const eventSlug = useEventSlug();
  const { login } = useAuth(eventSlug);
  const [slides, setSlides] = useState<string[]>([...DEFAULT_LOGIN_SLIDE_PATHS]);
  const [pin, setPin] = useState("");
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
      await login(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginPageLayout slides={slides}>
      <LoginCard title="Event sign in" backHref="/" backLabel="Back to all events">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="pin" className="mb-2 block text-sm font-medium text-foreground">
              PIN
            </label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •"
              className="text-center text-xl tracking-[0.4em]"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pin.length !== 4 || loading}>
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </LoginCard>
    </LoginPageLayout>
  );
}
