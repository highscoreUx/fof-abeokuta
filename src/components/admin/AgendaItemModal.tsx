"use client";

import { useEffect, useState } from "react";
import type { AgendaListItem } from "@/components/agenda/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDatetimeLocal } from "@/lib/agenda-format";
import { useEventApi } from "@/hooks/useEventApi";

interface AgendaItemModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  item?: AgendaListItem | null;
}

export function AgendaItemModal({ open, onClose, onSaved, item }: AgendaItemModalProps) {
  const { api } = useEventApi();
  const isEdit = Boolean(item);
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

  useEffect(() => {
    if (!open) return;
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setStartTime(toDatetimeLocal(item.startTime));
      setEndTime(toDatetimeLocal(item.endTime));
      setError("");
      return;
    }
    reset();
  }, [open, item]);

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
      const payload = { title, description, startTime, endTime };
      if (isEdit && item) {
        await api(`/agenda/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/agenda", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved?.();
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update agenda item"
            : "Failed to add agenda item",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? "Edit agenda item" : "Add agenda item"}
      description={
        isEdit
          ? "Update the session details below."
          : "Schedule sessions and milestones for your event day."
      }
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
            {saving ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save changes" : "Add to agenda"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
