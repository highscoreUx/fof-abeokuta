"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";

interface PendingCheckInViewProps {
  onReload: () => void;
}

export function PendingCheckInView({ onReload }: PendingCheckInViewProps) {
  const account = useAuthStore((s) => s.account);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl">You&apos;re not checked in yet</CardTitle>
          <CardDescription className="text-base">
            {account ? (
              <>
                <span className="font-medium text-foreground">{account.email}</span> is registered
                for this event, but check-in has not been completed. You&apos;ll get full access
                once event staff check you in.
              </>
            ) : (
              <>
                You&apos;re registered for this event, but check-in has not been completed.
                You&apos;ll get full access once event staff check you in.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button type="button" className="w-full" onClick={onReload}>
            Click once you&apos;ve been checked in
          </Button>
        </div>
      </Card>
    </div>
  );
}
