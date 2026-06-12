"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { FlashedCredentials } from "@/lib/platform-credentials-flash";

interface EventCredentialsBannerProps {
  credentials: FlashedCredentials;
  onDismiss: () => void;
}

export function EventCredentialsBanner({ credentials, onDismiss }: EventCredentialsBannerProps) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardTitle>Community staff credentials</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Share these with event staff for <strong>{credentials.eventTitle}</strong>. They sign in
        at{" "}
        <Link href={credentials.loginPath} className="text-primary underline">
          {credentials.loginPath}
        </Link>
        .
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-mono font-semibold">{credentials.user.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-mono font-semibold">{credentials.user.username}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Temporary password</dt>
          <dd className="font-mono font-semibold">{credentials.user.password}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd>
            {credentials.user.firstName} {credentials.user.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Role</dt>
          <dd>{credentials.user.permissionProfile}</dd>
        </div>
      </dl>
      <Button className="mt-4" variant="secondary" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </Card>
  );
}
