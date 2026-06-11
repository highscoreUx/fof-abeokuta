"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useEventSlug } from "@/hooks/useEventSlug";
import { LoginPageLayout } from "@/components/auth/LoginPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
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
      <Card className="w-full max-w-md">
        <CardTitle className="text-center text-2xl">Event Sign In</CardTitle>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Friends of Figma Abeokuta
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Enter your PIN</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              className="text-center text-2xl tracking-[0.5em]"
              autoFocus
            />
          </div>
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={pin.length !== 4 || loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-primary underline">
            Back to all events
          </Link>
        </p>
      </Card>
    </LoginPageLayout>
  );
}
