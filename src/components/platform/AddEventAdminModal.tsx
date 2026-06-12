"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PlatformCreatedEventUser } from "@/types";

interface AddEventAdminModalProps {
  open: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onCreated?: (payload: {
    credentials: PlatformCreatedEventUser;
    loginPath: string;
  }) => void;
}

export function AddEventAdminModal({
  open,
  eventId,
  eventTitle,
  onClose,
  onCreated,
}: AddEventAdminModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setFirstName("");
    setLastName("");
    setError("");
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await platformApiFetch<{
        user: PlatformCreatedEventUser;
        loginPath: string;
      }>(`/api/fg-admin/events/${eventId}/admin-user`, {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      onCreated?.({ credentials: result.user, loginPath: result.loginPath });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add event admin"
      description={`Creates an event admin for ${eventTitle}. Share the username and password so they can sign in.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="admin-first-name">First name</Label>
            <Input
              id="admin-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-last-name">Last name</Label>
            <Input
              id="admin-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !firstName.trim() || !lastName.trim()}>
            {loading ? "Creating…" : "Create event admin"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
