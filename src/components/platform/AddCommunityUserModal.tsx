"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { COMMUNITY_STAFF_PROFILE_SLUGS } from "@/lib/community-audience";
import { usePlatformRoles } from "@/hooks/usePlatformRoles";
import { platformApiFetch } from "@/lib/platform-api-client";
import type { SystemEventUserRoleSlug } from "@/lib/permissions/default-bundles";

interface AddCommunityUserModalProps {
  open: boolean;
  eventId: string;
  eventTitle: string;
  mode: "members" | "staff" | "participants";
  onClose: () => void;
  onCreated?: (credentials: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    permissionProfile: string;
  }) => void;
}

export function AddCommunityUserModal({
  open,
  eventId,
  eventTitle,
  mode,
  onClose,
  onCreated,
}: AddCommunityUserModalProps) {
  const { roles } = usePlatformRoles();
  const profileOptions =
    mode === "staff"
      ? roles.filter((profile) =>
          (COMMUNITY_STAFF_PROFILE_SLUGS as readonly string[]).includes(profile.slug),
        )
      : mode === "participants"
        ? roles.filter((profile) => profile.slug === "participant")
        : roles;

  const defaultProfile: SystemEventUserRoleSlug =
    mode === "staff" ? "staff" : "participant";

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [permissionProfile, setPermissionProfile] = useState<string>(defaultProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setPermissionProfile(defaultProfile);
  }, [open, defaultProfile]);

  const reset = () => {
    setEmail("");
    setUsername("");
    setFirstName("");
    setLastName("");
    setPermissionProfile(defaultProfile);
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
        user: { email: string; username: string; permissionProfile: string };
        initialPassword: string | null;
        permissionProfile: string;
      }>(`/api/fg-admin/events/${eventId}/users`, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          permissionProfile,
        }),
      });
      onCreated?.({
        email: result.user.email,
        username: result.user.username,
        password: result.initialPassword ?? "—",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        permissionProfile: result.permissionProfile ?? result.user.permissionProfile,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "staff"
      ? "Add community staff"
      : mode === "participants"
        ? "Add participant"
        : "Add community member";
  const description =
    mode === "staff"
      ? `Registers staff for ${eventTitle}. Staff are also community members with elevated access.`
      : mode === "participants"
        ? `Registers a participant for ${eventTitle}. Share email and temporary password after creating the account.`
        : `Registers a community member for ${eventTitle}. Share email and temporary password after creating the account.`;

  return (
    <Modal open={open} onClose={handleClose} title={title} description={description}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="member-first-name">First name</Label>
            <Input
              id="member-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="member-last-name">Last name</Label>
            <Input
              id="member-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="member-username">Username</Label>
          <Input
            id="member-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
          />
        </div>
        {mode !== "participants" && (
          <div>
            <Label htmlFor="member-profile">Permission profile</Label>
            <Select
              id="member-profile"
              className="w-full"
              value={permissionProfile}
              onChange={(e) => setPermissionProfile(e.target.value)}
            >
              {profileOptions.map((profile) => (
                <option key={profile.slug} value={profile.slug}>
                  {profile.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : title}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
