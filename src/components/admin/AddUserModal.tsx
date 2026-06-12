"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCreateUserMutation } from "@/hooks/useUsersQuery";
import { PERMISSION_PROFILES } from "@/lib/permission-profiles";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (credentials: {
    email: string;
    username: string;
    password: string;
    permissionProfile: string;
  }) => void;
}

export function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const createUser = useCreateUserMutation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [permissionProfile, setPermissionProfile] = useState("participant");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && !permissionProfile) {
      setPermissionProfile("participant");
    }
  }, [open, permissionProfile]);

  const reset = () => {
    setEmail("");
    setUsername("");
    setFirstName("");
    setLastName("");
    setPermissionProfile("participant");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await createUser.mutateAsync({
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        permissionProfile,
      });
      onCreated?.({
        email: result.user.email,
        username: result.user.username,
        password: result.initialPassword ?? "—",
        permissionProfile: result.permissionProfile ?? result.user.permissionProfile,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add user"
      description="Creates a global account and registers them for this event. Permissions apply everywhere they sign in."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="ada_okafor"
            required
          />
        </div>
        <div>
          <Label htmlFor="permissionProfile">Permission profile</Label>
          <Select
            id="permissionProfile"
            className="w-full"
            value={permissionProfile}
            onChange={(e) => setPermissionProfile(e.target.value)}
          >
            {PERMISSION_PROFILES.map((profile) => (
              <option key={profile.slug} value={profile.slug}>
                {profile.name}
              </option>
            ))}
          </Select>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createUser.isPending || !permissionProfile}>
            {createUser.isPending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
