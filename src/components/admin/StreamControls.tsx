"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/toast";

export function StreamControls() {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const [videoId, setVideoId] = useState("");
  const [live, setLive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ youtubeVideoId: string; streamLive: boolean }>("/settings").then((d) => {
      setVideoId(d.youtubeVideoId);
      setLive(d.streamLive);
    });
  }, [slug]);

  const save = async () => {
    setSaving(true);
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ youtubeVideoId: videoId, streamLive: live }),
      });
      socket?.emit("stream:admin:toggle", { live, videoId });
      toastSuccess("Broadcast settings saved");
    } catch (err) {
      toastError(
        "Failed to save broadcast settings",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcasting</CardTitle>
        <CardDescription>
          Stream via OBS to YouTube, then paste the video ID below. Toggle the live badge when you
          go on air.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="youtube-video-id">YouTube video ID</Label>
          <Input
            id="youtube-video-id"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="dQw4w9WgXcQ"
            className="mt-1.5 font-mono"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Show LIVE badge on the main stage
        </label>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save & broadcast"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
