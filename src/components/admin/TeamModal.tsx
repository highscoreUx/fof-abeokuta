"use client";

import { useEffect, useState } from "react";
import type { TeamRow } from "@/types/teams";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTeamMutation, useUpdateTeamMutation } from "@/hooks/useTeamsTableQuery";
import { BRAND_PRIMARY } from "@/lib/brand";

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
  team?: TeamRow | null;
  onSaved?: () => void;
}

const defaultForm = { letter: "", name: "", color: BRAND_PRIMARY };

export function TeamModal({ open, onClose, team, onSaved }: TeamModalProps) {
  const isEdit = Boolean(team);
  const createTeam = useCreateTeamMutation();
  const updateTeam = useUpdateTeamMutation();
  const [letter, setLetter] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultForm.color);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (team) {
      setLetter(team.letter);
      setName(team.name);
      setColor(team.color);
      setError("");
      return;
    }
    setLetter("");
    setName("");
    setColor(defaultForm.color);
    setError("");
  }, [open, team]);

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (isEdit && team) {
        await updateTeam.mutateAsync({ id: team.id, letter, name, color });
      } else {
        await createTeam.mutateAsync({ letter, name, color });
      }
      onSaved?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team");
    }
  };

  const saving = createTeam.isPending || updateTeam.isPending;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? "Edit team" : "Add team"}
      description={
        isEdit
          ? "Update the team code, name, or theme color."
          : "Create a team with any code and color theme for your event."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="team-code">Code</Label>
            <Input
              id="team-code"
              value={letter}
              onChange={(e) => setLetter(e.target.value.toUpperCase())}
              placeholder="A"
              className="font-mono uppercase"
              required
            />
          </div>
          <div>
            <Label htmlFor="team-color">Color</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                id="team-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono"
                placeholder={BRAND_PRIMARY}
              />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="team-name">Name</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create team"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
