"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface EventAdminDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  permissionProfile: string;
  createdAt: string;
}

interface EventAdminDetailsModalProps {
  open: boolean;
  onClose: () => void;
  admin: EventAdminDetails | null;
  eventSlug: string;
}

export function EventAdminDetailsModal({
  open,
  onClose,
  admin,
  eventSlug,
}: EventAdminDetailsModalProps) {
  if (!admin) return null;

  const fullName = `${admin.firstName} ${admin.lastName}`.trim();
  const signInPath = "/login";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Event admin details"
      description={`Share these login details with ${admin.firstName} so they can run the event.`}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{fullName}</p>
          <Badge variant="muted" className="uppercase">
            {admin.permissionProfile}
          </Badge>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-primary">{admin.email}</p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Username
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{admin.username}</p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Temporary password
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-foreground">
            {admin.password || "—"}
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sign in at
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">{signInPath}</p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Added
          </p>
          <p className="mt-1 text-sm text-foreground">
            {new Date(admin.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Link href={signInPath} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="outline">
              Open login page
            </Button>
          </Link>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
