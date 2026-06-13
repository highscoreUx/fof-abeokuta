"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PLATFORM_ADMIN_PROFILE_SLUG } from "@/lib/member-access";
import { usePlatformRoles } from "@/hooks/usePlatformRoles";
import { platformApiFetch } from "@/lib/platform-api-client";
import { toastError } from "@/lib/toast";
import type { PlatformMemberRow } from "@/types/members";

interface EditPlatformMemberModalProps {
  open: boolean;
  member: PlatformMemberRow | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditPlatformMemberModal({
  open,
  member,
  onClose,
  onUpdated,
}: EditPlatformMemberModalProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [permissionProfile, setPermissionProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!member) return;
    setEmail(member.email);
    setUsername(member.username);
    setFirstName(member.firstName);
    setLastName(member.lastName);
    setPermissionProfile(member.permissionProfileSlug);
  }, [member]);

  const { roles } = usePlatformRoles();
  const profileOptions = member?.isPlatformAdmin
    ? [{ slug: PLATFORM_ADMIN_PROFILE_SLUG, name: "Platform admin" }]
    : roles;

  const handleClose = () => {
    if (loading || deleting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!member) return;
    setLoading(true);
    try {
      await platformApiFetch(`/api/fg-admin/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          permissionProfile,
        }),
      });
      onUpdated();
      onClose();
    } catch (err) {
      toastError(
        "Failed to update member",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!member?.isDeletable) return;
    if (!window.confirm(`Delete ${member.firstName} ${member.lastName}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await platformApiFetch(`/api/fg-admin/members/${member.id}`, { method: "DELETE" });
      onUpdated();
      onClose();
    } catch (err) {
      toastError(
        "Failed to delete member",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!member) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit member"
      description="Update account details. Platform admin and participant accounts cannot be deleted."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-member-first-name">First name</Label>
            <Input
              id="edit-member-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-member-last-name">Last name</Label>
            <Input
              id="edit-member-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="edit-member-email">Email</Label>
          <Input
            id="edit-member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-member-username">Username</Label>
          <Input
            id="edit-member-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-member-profile">Permission profile</Label>
          <Select
            id="edit-member-profile"
            className="w-full"
            value={permissionProfile}
            onChange={(e) => setPermissionProfile(e.target.value)}
            disabled={member.isPlatformAdmin}
          >
            {profileOptions.map((profile) => (
              <option key={profile.slug} value={profile.slug}>
                {profile.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          {member.isDeletable ? (
            <Button
              type="button"
              variant="outline"
              className="text-danger"
              onClick={() => void handleDelete()}
              disabled={loading || deleting}
            >
              {deleting ? "Deleting…" : "Delete member"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              This account is locked and cannot be deleted.
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading || deleting}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || deleting}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
