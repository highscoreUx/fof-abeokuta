"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { GlobalMembersAudience } from "@/lib/member-access";
import { useMemberProfileOptions } from "@/hooks/useMemberProfileOptions";
import { usePlatformRoles } from "@/hooks/usePlatformRoles";
import { platformApiFetch } from "@/lib/platform-api-client";
import { toastError } from "@/lib/toast";
import type { SystemEventUserRoleSlug } from "@/lib/permissions/default-bundles";

interface AddPlatformMemberModalProps {
  open: boolean;
  audience: GlobalMembersAudience;
  onClose: () => void;
  onCreated?: (payload: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    permissionProfile: string;
    emailQueued: boolean;
  }) => void;
}

export function AddPlatformMemberModal({
  open,
  audience,
  onClose,
  onCreated,
}: AddPlatformMemberModalProps) {
  const { roles } = usePlatformRoles();
  const profileOptions = useMemberProfileOptions({ roles });
  const selectableProfiles =
    audience === "staff"
      ? profileOptions.filter((profile) => profile.slug !== "participant")
      : profileOptions;

  const defaultProfile: SystemEventUserRoleSlug =
    audience === "staff" ? "staff" : "participant";

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [permissionProfile, setPermissionProfile] = useState<string>(defaultProfile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setPermissionProfile(defaultProfile);
  }, [open, defaultProfile]);

  const reset = () => {
    setEmail("");
    setUsername("");
    setFirstName("");
    setLastName("");
    setPermissionProfile(defaultProfile);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await platformApiFetch<{
        member: { email: string; username: string };
        emailQueued: boolean;
        permissionProfile: string;
      }>("/api/fg-admin/members", {
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
        email: result.member.email,
        username: result.member.username,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        permissionProfile: result.permissionProfile,
        emailQueued: result.emailQueued,
      });
      handleClose();
    } catch (err) {
      toastError(
        "Failed to add member",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  const title = audience === "staff" ? "Add staff" : "Add member";
  const description =
    audience === "staff"
      ? "Create a global staff account. Staff are community members who are not participants."
      : "Create a community member account. Participants are members who join events.";

  return (
    <Modal open={open} onClose={handleClose} title={title} description={description}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="platform-member-first-name">First name</Label>
            <Input
              id="platform-member-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="platform-member-last-name">Last name</Label>
            <Input
              id="platform-member-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="platform-member-email">Email</Label>
          <Input
            id="platform-member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="platform-member-username">Username</Label>
          <Input
            id="platform-member-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
          />
        </div>
        <div>
          <Label htmlFor="platform-member-profile">Permission profile</Label>
          <Select
            id="platform-member-profile"
            className="w-full"
            value={permissionProfile}
            onChange={(e) => setPermissionProfile(e.target.value)}
          >
            {selectableProfiles.map((profile) => (
              <option key={profile.slug} value={profile.slug}>
                {profile.name}
              </option>
            ))}
          </Select>
        </div>
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
