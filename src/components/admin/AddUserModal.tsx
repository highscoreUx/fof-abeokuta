"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCreateUserMutation } from "@/hooks/useUsersQuery";
import type { Role } from "@/types";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (credentials: { username: string; password: string; role: Role }) => void;
}

const ROLES: Role[] = ["PARTICIPANT", "STAFF", "JUDGE", "ADMIN"];

export function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const createUser = useCreateUserMutation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [role, setRole] = useState<Role>("PARTICIPANT");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setFirstName("");
    setLastName("");
    setMiddleName("");
    setRole("PARTICIPANT");
    setPassword("");
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
        middleName: middleName.trim() || undefined,
        role,
        password: password || undefined,
      });
      onCreated?.({
        username: result.user.username,
        password: result.user.password ?? "—",
        role: result.user.role,
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
          <Label htmlFor="middleName">Middle name (optional)</Label>
          <Input
            id="middleName"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="password">Password (optional)</Label>
            <Input
              id="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="Auto if empty"
            />
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
