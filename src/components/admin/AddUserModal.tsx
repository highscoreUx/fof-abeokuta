"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCreateUserMutation } from "@/hooks/useUsersQuery";
import { useEventUserRolesQuery } from "@/hooks/useEventUserRolesQuery";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (credentials: {
    username: string;
    password: string;
    eventUserRoleName: string;
  }) => void;
}

export function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const createUser = useCreateUserMutation();
  const { data: rolesData } = useEventUserRolesQuery(open);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [eventUserRoleId, setEventUserRoleId] = useState("");
  const [error, setError] = useState("");

  const roles = rolesData?.roles ?? [];

  useEffect(() => {
    if (!eventUserRoleId && roles.length > 0) {
      const participant = roles.find((r) => r.slug === "participant");
      setEventUserRoleId(participant?.id ?? roles[0].id);
    }
  }, [roles, eventUserRoleId]);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEventUserRoleId(roles.find((r) => r.slug === "participant")?.id ?? "");
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        eventUserRoleId,
      });
      onCreated?.({
        username: result.user.username,
        password: result.user.password ?? "—",
        eventUserRoleName: result.user.eventUserRoleName,
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
      description="Usernames are auto-generated. Share the password with staff at check-in."
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
          <Label htmlFor="eventUserRoleId">Access profile</Label>
          <Select
            id="eventUserRoleId"
            className="w-full"
            value={eventUserRoleId}
            onChange={(e) => setEventUserRoleId(e.target.value)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createUser.isPending || !eventUserRoleId}>
            {createUser.isPending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
