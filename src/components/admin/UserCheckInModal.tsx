"use client";

import { useEffect, useState } from "react";
import type { EventUserRow } from "@/types/users";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCheckInUserMutation,
  useUncheckInUserMutation,
} from "@/hooks/useUsersQuery";
import { platformApiFetch } from "@/lib/platform-api-client";
import { useEventSettings } from "@/hooks/useEventSettings";
import { usePlatformEventSettings } from "@/hooks/usePlatformEventSettings";
import type { CheckInUserPayload } from "@/lib/check-in";
import { toastError } from "@/lib/toast";

interface UserCheckInModalProps {
  open: boolean;
  onClose: () => void;
  user: EventUserRow | null;
  /** When set, uses platform admin APIs instead of event-scoped hooks. */
  platformEventId?: string;
  onUpdated?: () => void;
  /** When false, hides check-in / undo actions (details remain viewable). */
  canManageCheckIn?: boolean;
  /** When false, hides team assignment details. */
  showTeam?: boolean;
}

function displayEmail(user: EventUserRow): string {
  return user.email ?? user.maskedEmail ?? "Not set";
}

function UserCheckInModalContent({
  open,
  onClose,
  details,
  isCheckedIn,
  busy,
  emailInput,
  onEmailChange,
  onCheckIn,
  onUncheck,
  canManageCheckIn = true,
  showTeam = true,
}: {
  open: boolean;
  onClose: () => void;
  details: EventUserRow;
  isCheckedIn: boolean;
  busy: boolean;
  emailInput: string;
  onEmailChange: (value: string) => void;
  onCheckIn: () => Promise<void>;
  onUncheck: () => Promise<void>;
  canManageCheckIn?: boolean;
  showTeam?: boolean;
}) {
  const fullName = `${details.firstName} ${details.lastName}`.trim();
  const needsEmail = details.needsEmail ?? !details.email;

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
          {needsEmail && !isCheckedIn ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email (required for check-in)
              </p>
              {details.maskedEmail && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Ticket export: <span className="font-mono">{details.maskedEmail}</span>
                </p>
              )}
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Ask attendee for their email"
                className="mt-2"
              />
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-primary">
                {displayEmail(details)}
              </p>
            </>
          )}

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Username
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{details.username}</p>

          {showTeam && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Team
              </p>
              <p className="mt-1 text-sm text-foreground">
                {details.teamLetter ? `Team ${details.teamLetter}` : "Not assigned yet"}
              </p>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {isCheckedIn
            ? "This person is checked in and can sign in. Undo check-in if you need to correct a mistake."
            : needsEmail
              ? "Collect their real email, then check them in so they can sign in."
              : "Confirm their email, then check them in when ready."}
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {canManageCheckIn &&
            (isCheckedIn ? (
              <Button
                type="button"
                variant="outline"
                className="text-danger"
                onClick={() => void onUncheck()}
                disabled={busy}
              >
                {busy ? "Undoing…" : "Undo check-in"}
              </Button>
            ) : (
              <Button type="button" onClick={() => void onCheckIn()} disabled={busy}>
                {busy ? "Checking in…" : "Check in"}
              </Button>
            ))}
        </div>
      </div>
    </Modal>
  );
}

function EventUserCheckInModal({
  open,
  onClose,
  user,
  canManageCheckIn = true,
  showTeam,
}: Pick<UserCheckInModalProps, "open" | "onClose" | "user" | "canManageCheckIn" | "showTeam">) {
  const { teamingEnabled } = useEventSettings();
  const checkInUser = useCheckInUserMutation();
  const uncheckInUser = useUncheckInUserMutation();
  const [details, setDetails] = useState<EventUserRow | null>(null);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    if (open && user) {
      setDetails(user);
      setEmailInput("");
    }
  }, [open, user]);

  if (!details) return null;

  const isCheckedIn = Boolean(details.checkedInAt);
  const busy = checkInUser.isPending || uncheckInUser.isPending;
  const needsEmail = details.needsEmail ?? !details.email;

  return (
    <UserCheckInModalContent
      open={open}
      onClose={onClose}
      details={details}
      isCheckedIn={isCheckedIn}
      busy={busy}
      emailInput={emailInput}
      onEmailChange={setEmailInput}
      onCheckIn={async () => {
        try {
          const result = await checkInUser.mutateAsync({
            userId: details.id,
            email: needsEmail ? emailInput.trim() : undefined,
          });
          setDetails((prev) =>
            prev
              ? {
                  ...prev,
                  ...result.user,
                  email: result.user.email,
                  needsEmail: result.user.needsEmail,
                  maskedEmail: result.user.maskedEmail,
                }
              : prev,
          );
        } catch (err) {
          toastError(
            "Failed to check in user",
            err instanceof Error ? err.message : undefined,
          );
        }
      }}
      onUncheck={async () => {
        try {
          const result = await uncheckInUser.mutateAsync(details.id);
          setDetails((prev) => (prev ? { ...prev, ...result.user } : prev));
        } catch (err) {
          toastError(
            "Failed to undo check-in",
            err instanceof Error ? err.message : undefined,
          );
        }
      }}
      canManageCheckIn={canManageCheckIn}
      showTeam={showTeam ?? teamingEnabled}
    />
  );
}

function PlatformUserCheckInModal({
  open,
  onClose,
  user,
  platformEventId,
  onUpdated,
  canManageCheckIn = true,
  showTeam,
}: Required<Pick<UserCheckInModalProps, "platformEventId">> &
  Pick<UserCheckInModalProps, "open" | "onClose" | "user" | "onUpdated" | "canManageCheckIn" | "showTeam">) {
  const { teamingEnabled } = usePlatformEventSettings(platformEventId);
  const [details, setDetails] = useState<EventUserRow | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && user) {
      setDetails(user);
      setEmailInput("");
    }
  }, [open, user]);

  if (!details) return null;

  const needsEmail = details.needsEmail ?? !details.email;

  const applyCheckInResult = (payload: CheckInUserPayload) => {
    setDetails((prev) =>
      prev
        ? {
            ...prev,
            teamLetter: payload.teamLetter,
            checkedInAt: payload.checkedInAt,
            email: payload.email,
            maskedEmail: payload.maskedEmail,
            needsEmail: payload.needsEmail,
          }
        : prev,
    );
    onUpdated?.();
  };

  return (
    <UserCheckInModalContent
      open={open}
      onClose={onClose}
      details={details}
      isCheckedIn={Boolean(details.checkedInAt)}
      busy={busy}
      emailInput={emailInput}
      onEmailChange={setEmailInput}
      onCheckIn={async () => {
        setBusy(true);
        try {
          const result = await platformApiFetch<{ user: CheckInUserPayload }>(
            `/api/fg-admin/events/${platformEventId}/users/${details.id}/check-in`,
            {
              method: "PATCH",
              body: JSON.stringify(needsEmail ? { email: emailInput.trim() } : {}),
            },
          );
          applyCheckInResult(result.user);
        } catch (err) {
          toastError(
            "Failed to check in user",
            err instanceof Error ? err.message : undefined,
          );
        } finally {
          setBusy(false);
        }
      }}
      onUncheck={async () => {
        setBusy(true);
        try {
          const result = await platformApiFetch<{ user: CheckInUserPayload }>(
            `/api/fg-admin/events/${platformEventId}/users/${details.id}/check-in`,
            { method: "DELETE" },
          );
          applyCheckInResult(result.user);
        } catch (err) {
          toastError(
            "Failed to undo check-in",
            err instanceof Error ? err.message : undefined,
          );
        } finally {
          setBusy(false);
        }
      }}
      canManageCheckIn={canManageCheckIn}
      showTeam={showTeam ?? teamingEnabled}
    />
  );
}

export function UserCheckInModal({
  open,
  onClose,
  user,
  platformEventId,
  onUpdated,
  canManageCheckIn = true,
  showTeam,
}: UserCheckInModalProps) {
  if (platformEventId) {
    return (
      <PlatformUserCheckInModal
        open={open}
        onClose={onClose}
        user={user}
        platformEventId={platformEventId}
        onUpdated={onUpdated}
        canManageCheckIn={canManageCheckIn}
        showTeam={showTeam}
      />
    );
  }

  return (
    <EventUserCheckInModal
      open={open}
      onClose={onClose}
      user={user}
      canManageCheckIn={canManageCheckIn}
      showTeam={showTeam}
    />
  );
}
