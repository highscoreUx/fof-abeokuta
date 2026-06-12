"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";

interface NotRegisteredViewProps {
  eventTitle?: string;
}

export function NotRegisteredView({ eventTitle }: NotRegisteredViewProps) {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl">You did not register for this event</CardTitle>
          <CardDescription className="text-base">
            {eventTitle ? (
              <>
                Your account{account ? ` (${account.email})` : ""} is not registered for{" "}
                <span className="font-medium text-foreground">{eventTitle}</span>. Browse other
                events or contact event staff if you think this is a mistake.
              </>
            ) : (
              <>
                Your account is not registered for this event. Browse other events or contact event
                staff if you think this is a mistake.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 px-6 pb-6">
          <Link href="/all-event">
            <Button className="w-full">View all events</Button>
          </Link>
          <Button type="button" variant="outline" className="w-full" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}
