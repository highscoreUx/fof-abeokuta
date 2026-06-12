"use client";

import { useEffect, useState } from "react";
import type { EventUserRow } from "@/types/users";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCheckInUserMutation,
  useUncheckInUserMutation,
} from "@/hooks/useUsersQuery";

interface UserCheckInModalProps {
  open: boolean;
  onClose: () => void;
  user: EventUserRow | null;
}

export function UserCheckInModal({ open, onClose, user }: UserCheckInModalProps) {
  const checkInUser = useCheckInUserMutation();
  const uncheckInUser = useUncheckInUserMutation();
  const [details, setDetails] = useState<EventUserRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && user) {
      setDetails(user);
      setError("");
    }
  }, [open, user]);

  if (!details) return null;

  const fullName = `${details.firstName} ${details.lastName}`.trim();
  const isCheckedIn = Boolean(details.checkedInAt);
  const busy = checkInUser.isPending || uncheckInUser.isPending;

  const handleCheckIn = async () => {
    setError("");
    try {
      const result = await checkInUser.mutateAsync(details.id);
      setDetails((prev) => (prev ? { ...prev, ...result.user } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in user");
    }
  };

  const handleUncheck = async () => {
    setError("");
    try {
      const result = await uncheckInUser.mutateAsync(details.id);
      setDetails((prev) => (prev ? { ...prev, ...result.user } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo check-in");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Check-in details"
      description={`Confirm sign-in details for ${details.firstName} before check-in.`}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{fullName}</p>
          <Badge variant="muted" className="uppercase">
            {details.permissionProfile}
          </Badge>
          {isCheckedIn ? (
            <Badge variant="success">Checked in</Badge>
          ) : (
            <Badge variant="muted">Not checked in</Badge>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-primary">{details.email}</p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Username
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{details.username}</p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Team
          </p>
          <p className="mt-1 text-sm text-foreground">
            {details.teamLetter ? `Team ${details.teamLetter}` : "Not assigned yet"}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {isCheckedIn
            ? "This person is checked in and can sign in. Undo check-in if you need to correct a mistake."
            : "Confirm their email, then check them in when ready."}
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {isCheckedIn ? (
            <Button
              type="button"
              variant="outline"
              className="text-danger"
              onClick={() => void handleUncheck()}
              disabled={busy}
            >
              {uncheckInUser.isPending ? "Undoing…" : "Undo check-in"}
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleCheckIn()} disabled={busy}>
              {checkInUser.isPending ? "Checking in…" : "Check in"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
