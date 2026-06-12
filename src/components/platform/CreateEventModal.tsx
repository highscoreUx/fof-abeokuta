"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { PlatformCreatedEventUser, PlatformEvent } from "@/types";

export interface CreatedEventResult {
  event: PlatformEvent;
  credentials: PlatformCreatedEventUser;
  loginPath: string;
}

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (result: CreatedEventResult, coverFile?: File) => void;
}

export function CreateEventModal({ open, onClose, onCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setAdminEmail("");
    setAdminUsername("");
    setAdminFirstName("");
    setAdminLastName("");
    setCoverFile(null);
    setCoverPreview(null);
    setError("");
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(date) &&
    Boolean(adminEmail.trim()) &&
    Boolean(adminUsername.trim()) &&
    Boolean(adminFirstName.trim()) &&
    Boolean(adminLastName.trim());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const result = await platformApiFetch<{
        event: PlatformEvent;
        adminUser?: PlatformCreatedEventUser;
        loginPath?: string;
      }>("/api/fg-admin/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          date: new Date(date).toISOString(),
          adminEmail: adminEmail.trim().toLowerCase(),
          adminUsername: adminUsername.trim().toLowerCase(),
          adminFirstName: adminFirstName.trim(),
          adminLastName: adminLastName.trim(),
        }),
      });

      const fileToUpload = coverFile;
      if (result.adminUser && result.loginPath) {
        onCreated?.(
          {
            event: result.event,
            credentials: result.adminUser,
            loginPath: result.loginPath,
          },
          fileToUpload ?? undefined,
        );
      }

      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create event"
      description="Sets up the event, default teams, and the first event admin account."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-foreground">Event details</legend>
          <div>
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Your Start-up in X Hours"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Slug is generated from the title (e.g. your-start-up-in-x-hours).
            </p>
          </div>
          <div>
            <Label htmlFor="event-date">Date & time</Label>
            <Input
              id="event-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="event-description">Description</Label>
            <Input
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="event-cover">Cover image</Label>
            <Input
              id="event-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setCoverFile(file);
                setCoverPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. JPEG, PNG, or WebP up to 5MB.
            </p>
            {coverPreview && (
              <img
                src={coverPreview}
                alt="Cover preview"
                className="mt-3 h-32 w-full rounded-lg object-cover"
              />
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-foreground">Event admin</legend>
          <p className="text-xs text-muted-foreground">
            This person runs the event app. They sign in with email and password.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-first-name">First name</Label>
              <Input
                id="admin-first-name"
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-last-name">Last name</Label>
              <Input
                id="admin-last-name"
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                required
              />
            </div>
          </div>
        </fieldset>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !canSubmit}>
            {loading ? "Creating…" : "Create event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
