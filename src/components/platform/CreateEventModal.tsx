"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { platformApiFetch, platformApiUpload } from "@/lib/platform-api-client";
import type { PlatformEvent } from "@/types";

type CoverMode = "upload" | "url";

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (event: PlatformEvent) => void;
}

function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function CreateEventModal({ open, onClose, onCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [coverMode, setCoverMode] = useState<CoverMode>("upload");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setCoverMode("upload");
    setCoverFile(null);
    setCoverUrl("");
    setCoverPreview(null);
    setError("");
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const switchCoverMode = (mode: CoverMode) => {
    setCoverMode(mode);
    setCoverFile(null);
    setCoverUrl("");
    setCoverPreview(null);
    setError("");
  };

  const canSubmit = Boolean(title.trim()) && Boolean(date);

  const applyCover = async (event: PlatformEvent) => {
    if (coverMode === "upload" && coverFile) {
      const form = new FormData();
      form.append("file", coverFile);
      await platformApiUpload(`/api/fg-admin/events/${event.id}/cover`, form);
      return;
    }

    const trimmedUrl = coverUrl.trim();
    if (coverMode === "url" && trimmedUrl) {
      if (!isValidImageUrl(trimmedUrl)) {
        throw new Error("Enter a valid image URL (http or https).");
      }
      await platformApiFetch(`/api/fg-admin/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ coverImageUrl: trimmedUrl }),
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const result = await platformApiFetch<{ event: PlatformEvent }>("/api/fg-admin/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          date: new Date(date).toISOString(),
        }),
      });

      await applyCover(result.event);
      onCreated?.(result.event);
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
      description="Sets up the event and default teams. Add users from the event detail page when you're ready."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
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
          <div className="space-y-3">
            <Label>Cover image</Label>
            <SegmentedControl
              value={coverMode}
              onChange={switchCoverMode}
              options={[
                { value: "upload", label: "Upload file" },
                { value: "url", label: "Image URL" },
              ]}
            />
            {coverMode === "upload" ? (
              <>
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
                <p className="text-xs text-muted-foreground">
                  Optional. JPEG, PNG, or WebP up to 5MB.
                </p>
              </>
            ) : (
              <>
                <Input
                  id="event-cover-url"
                  type="url"
                  value={coverUrl}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCoverUrl(value);
                    setCoverPreview(isValidImageUrl(value) ? value.trim() : null);
                  }}
                  placeholder="https://example.com/cover.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Paste a direct link to a JPEG, PNG, or WebP image.
                </p>
              </>
            )}
            {coverPreview && (
              <img
                src={coverPreview}
                alt="Cover preview"
                className="h-32 w-full rounded-lg object-cover"
              />
            )}
          </div>
        </div>

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
