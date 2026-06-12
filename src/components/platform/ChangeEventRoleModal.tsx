"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { EventUserRow } from "@/types/users";

interface RoleOption {
  slug: string;
  name: string;
}

interface ChangeEventRoleModalProps {
  open: boolean;
  onClose: () => void;
  user: EventUserRow | null;
  eventId: string;
  roleOptions: RoleOption[];
  onUpdated: () => void;
}

export function ChangeEventRoleModal({
  open,
  onClose,
  user,
  eventId,
  roleOptions,
  onUpdated,
}: ChangeEventRoleModalProps) {
  const [permissionProfile, setPermissionProfile] = useState("participant");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setPermissionProfile(user.permissionProfileSlug ?? "participant");
    setEmail("");
    setError("");
  }, [open, user]);

  if (!user) return null;

  const needsEmail = user.needsEmail ?? !user.email;
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  const submit = async () => {
    if (permissionProfile === (user.permissionProfileSlug ?? "participant")) {
      onClose();
      return;
    }

    setBusy(true);
    setError("");
    try {
      await platformApiFetch(`/api/fg-admin/events/${eventId}/users/${user.id}/access`, {
        method: "PATCH",
        body: JSON.stringify({
          permissionProfile,
          ...(needsEmail ? { email: email.trim() } : {}),
        }),
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change event role"
      description={`Update access for ${fullName} at this event only.`}
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Role</p>
          <Select
            value={permissionProfile}
            onChange={(e) => setPermissionProfile(e.target.value)}
          >
            {roleOptions.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.name}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-sm text-muted-foreground">
            This only affects this event. Their global account stays a participant.
          </p>
        </div>

        {needsEmail && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Email (required)</p>
            {user.maskedEmail && (
              <p className="mb-2 text-sm text-muted-foreground">
                Ticket export: <span className="font-mono">{user.maskedEmail}</span>
              </p>
            )}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ask attendee for their email"
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || (needsEmail && !email.trim())}>
            {busy ? "Saving…" : "Save role"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
