"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventApi } from "@/hooks/useEventApi";

interface AddAgendaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function AddAgendaModal({ open, onClose, onCreated }: AddAgendaModalProps) {
  const { api } = useEventApi();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title || !startTime || !endTime) return;

    setSaving(true);
    setError("");
    try {
      await api("/agenda", {
        method: "POST",
        body: JSON.stringify({ title, description, startTime, endTime }),
      });
      onCreated?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add agenda item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add agenda item"
      description="Schedule sessions and milestones for your event day."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="agenda-title">Title</Label>
          <Input
            id="agenda-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Opening keynote"
            required
          />
        </div>
        <div>
          <Label htmlFor="agenda-description">Description</Label>
          <Input
            id="agenda-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="agenda-start">Starts</Label>
            <Input
              id="agenda-start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="agenda-end">Ends</Label>
            <Input
              id="agenda-end"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add to agenda"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
