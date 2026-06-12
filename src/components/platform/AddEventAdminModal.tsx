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
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setEmail("");
    setUsername("");
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
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      onCreated?.({ credentials: result.user, loginPath: result.loginPath });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event staff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add event staff"
      description={`Registers event staff for ${eventTitle}. Share the email and temporary password so they can sign in.`}
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
        <div>
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="admin-username">Username</Label>
          <Input
            id="admin-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !email.trim() || !username.trim() || !firstName.trim() || !lastName.trim()}
          >
            {loading ? "Adding…" : "Add event staff"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
